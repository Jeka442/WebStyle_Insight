let imageUrls = [];

async function startup() {
  document
    .getElementById("downloadAll")
    .addEventListener("click", downloadBulk);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id !== undefined) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function stablalizeUrl(url) {
          if (url) {
            let path = url;
            if (path.includes("base64")) {
              return path;
            }
            if (path.includes("///")) {
              const prefix = path.substring(0, path.indexOf("://"));
              path = prefix + "://" + path.split("///")[1];
            }
            if (!path.startsWith("http")) {
              path = location.origin + "/" + path;
            }

            return path;
          }
          return undefined;
        }

        const urls = new Set();
        function getBackgroundImageUrl(element, pseudo) {
          const style = window.getComputedStyle(element, pseudo);
          const backgroundImage = style.getPropertyValue("background-image");
          if (backgroundImage && backgroundImage !== "none") {
            const url = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
            if (url) {
              const stableUrl = stablalizeUrl(url[1]);
              if (stableUrl) {
                urls.add(stableUrl);
              }
            }
          }
        }

        document.querySelectorAll("*").forEach((el) => {
          if (el.tagName.toLocaleLowerCase() === "img") {
            handleImg(el);
          }
          getBackgroundImageUrl(el, null); // For the element itself
          getBackgroundImageUrl(el, "::before"); // For the ::before pseudo-element
          getBackgroundImageUrl(el, "::after"); // For the ::after pseudo-element
        });

        function handleImg(img) {
          const src = img.getAttribute("src");
          const stableUrl = stablalizeUrl(src);
          if (stableUrl) {
            urls.add(stableUrl);
          }
        }

        chrome.runtime.sendMessage({
          action: "images",
          data: Array.from(urls),
        });
      },
    });
  } else {
    console.error("No active tab found or tab ID is undefined");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "images") {
    const images = message.data;
    imageUrls = images;
    if (images.length > 0) {
      document.getElementById("container").innerHTML = "";
      for (let image of images) {
        const divContainer = document.createElement("div");
        divContainer.className = "imgContainer";
        const img = document.createElement("img");
        img.src = image;
        img.onerror = function () {
          img.onerror = null;
          img.src = "assets/broken.png";
          img.setAttribute("data-broken", image);
        };
        divContainer.addEventListener("click", function () {
          chrome.downloads.download(
            {
              url: img.src,
              conflictAction: "uniquify",
            },
            function (downloadId) {}
          );
        });
        divContainer.appendChild(img);
        document.getElementById("container").appendChild(divContainer);
      }
    } else {
      document.getElementById("downloadAll").remove();
    }
  }
});

function downloadBulk() {
  const btn = document.getElementById("downloadAll");
  btn.innerText = "Downloading...";
  btn.setAttribute("data-state", "downloading");

  let completedDownloads = 0;
  const totalDownloads = imageUrls.length;

  imageUrls.forEach((url, index) => {
    chrome.downloads.download(
      {
        url: url,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error downloading ${url}:`,
            chrome.runtime.lastError.message
          );
          checkIfAllDownloadsCompleted();
        } else {
          chrome.downloads.onChanged.addListener(function listener(
            downloadDelta
          ) {
            if (
              downloadDelta.id === downloadId &&
              downloadDelta.state &&
              (downloadDelta.state.current === "complete" ||
                downloadDelta.state.current === "interrupted")
            ) {
              chrome.downloads.onChanged.removeListener(listener);
              checkIfAllDownloadsCompleted();
            }
          });
        }
      }
    );
  });

  function checkIfAllDownloadsCompleted() {
    completedDownloads++;
    if (completedDownloads === totalDownloads) {
      btn.innerText = "Download All";
      btn.setAttribute("data-state", "");
    }
  }
}

startup();
