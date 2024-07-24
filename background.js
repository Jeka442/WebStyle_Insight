chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "elementToRemove",
    title: "remove element",
    contexts: ["all"],
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggleEditable",
    title: "Toggle editable",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "toggleEditable") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const isEditable = document.body.contentEditable === "true";
        document.body.contentEditable = isEditable ? "false" : "true";
      },
    });
  } else if (info.menuItemId === "elementToRemove") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.capturedElement.remove();
      },
    });
  }
});
