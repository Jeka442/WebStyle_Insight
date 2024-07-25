async function startup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id !== undefined) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const libraries = {
          "Tailwind CSS": [
            /^mt-/,
            /^p-/,
            /^flex-/,
            /^grid-/,
            /^gap-/,
            /^w-/,
            /^h-/,
            /^m-/,
            /^rounded-/,
            /^shadow-/,
            /^font-/,
            /^leading-/,
            /^tracking-/,
            /^truncate/,
            /^overflow-/,
            /^z-/,
            /^inset-/,
            /^space-/,
            /^divide-/,
            /^opacity-/,
            /^pointer-events-/,
            /^select-/,
            /^resize-/,
            /^appearance-/,
            /^cursor-/,
            /^align-/,
            /^justify-/,
            /^items-/,
            /^content-/,
            /^self-/,
          ],
          "Material-UI": [/^Mui/, /^makeStyles/],
          Bootstrap: [
            /^btn-/,
            /^col-/,
            /^d-/,
            /^container/,
            /^row-/,
            /^navbar/,
            /^card-/,
            /^alert-/,
            /^badge-/,
            /^breadcrumb-/,
            /^carousel-/,
            /^dropdown-/,
            /^form-/,
            /^input-/,
            /^modal-/,
            /^nav-/,
            /^pagination-/,
            /^popover-/,
            /^progress-/,
            /^table-/,
            /^tooltip-/,
            /^visible-/,
            /^sr-/,
            /^text-muted/,
          ],
          "ShadCN/UI": [/^shadcn-/],
          "Ant Design": [
            /^ant-/,
            /^anticon-/,
            /^ant-btn-/,
            /^ant-col-/,
            /^ant-row-/,
            /^ant-form-/,
            /^ant-input-/,
            /^ant-modal-/,
            /^ant-card-/,
            /^ant-alert-/,
            /^ant-badge-/,
            /^ant-breadcrumb-/,
            /^ant-carousel-/,
            /^ant-dropdown-/,
            /^ant-pagination-/,
            /^ant-popover-/,
            /^ant-progress-/,
            /^ant-table-/,
            /^ant-tooltip-/,
            /^ant-menu-/,
            /^ant-select-/,
          ],
          "Styled Components": [/^sc-/],
        };

        const elements = document.querySelectorAll("*");
        const detectedLibraries = {};

        elements.forEach((element) => {
          try {
            const classes = element?.className?.split(" ") ?? [];
            for (const lib in libraries) {
              libraries[lib].forEach((regex) => {
                classes.forEach((className) => {
                  if (regex.test(className)) {
                    detectedLibraries[lib] = (detectedLibraries[lib] || 0) + 1;
                  }
                });
              });
            }
          } catch {}
        });

        const results = Object.entries(detectedLibraries)
          .map(([lib, count]) => {
            return { library: lib, count: count };
          })
          .sort((a, b) => b.count - a.count);

        if (results.length > 0) {
          chrome.runtime.sendMessage({
            action: "css-framework-detected",
            data: { results },
          });
        }

        // colors and fonts =====================================
        const backgroundColors = new Set();
        const textColors = new Set();
        const borderColors = new Set();

        // Function to add color to the appropriate set
        function addColor(colorSet, color) {
          if (color && color !== "transparent" && !colorSet.has(color)) {
            colorSet.add(color);
          }
        }
        // Get all elements in the document
        const allElements = document.querySelectorAll("*");
        const textStylesMap = new Map();

        allElements.forEach((element) => {
          extractColors(element);
          const computedStyle = window.getComputedStyle(element);
          const fontSize = computedStyle.fontSize;
          const lineHeight = computedStyle.lineHeight;
          const fontFamily = computedStyle.fontFamily;

          if (fontSize || lineHeight || fontFamily) {
            const key = `${fontSize}-${lineHeight}-${fontFamily}`;
            if (!textStylesMap.has(key)) {
              textStylesMap.set(key, {
                tagName: element.tagName,
                fontSize: fontSize,
                lineHeight: lineHeight,
                fontFamily: fontFamily,
              });
            }
          }
        });

        // Function to get and add color properties from an element
        function extractColors(element) {
          const styles = window.getComputedStyle(element);
          // Add background color
          addColor(backgroundColors, styles.backgroundColor);
          // Add text color
          addColor(textColors, styles.color);
          // Add border colors
          addColor(borderColors, styles.borderTopColor);
          addColor(borderColors, styles.borderRightColor);
          addColor(borderColors, styles.borderBottomColor);
          addColor(borderColors, styles.borderLeftColor);
        }

        // Convert Sets to Arrays and sort
        const uniqueTextStyles = Array.from(textStylesMap.values());
        const backgroundArray = Array.from(backgroundColors).sort();
        const textArray = Array.from(textColors).sort();
        const borderArray = Array.from(borderColors).sort();
        chrome.runtime.sendMessage({
          action: "colors",
          data: { backgroundArray, textArray, borderArray, uniqueTextStyles },
        });
      },
    });
  } else {
    console.error("No active tab found or tab ID is undefined");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "css-framework-detected") {
    const { results } = message.data;
    if (results.length > 0) {
      document.getElementById("css-framework").innerHTML = results
        .map((result) => `<li>${result.library}</li>`)
        .join("");
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "colors") {
    const { backgroundArray, textArray, borderArray, uniqueTextStyles } =
      message.data;
    for (let color of backgroundArray) {
      displayColor(color, "background");
    }
    for (let color of textArray) {
      displayColor(color, "text");
    }
    for (let color of borderArray) {
      displayColor(color, "border");
    }
    appendColors(uniqueTextStyles);
  }
});

function getRGBComponents(color) {
  const rgba = color.replace(/^rgba?\(|\s+|\)$/g, "").split(",");
  return {
    r: parseInt(rgba[0], 10),
    g: parseInt(rgba[1], 10),
    b: parseInt(rgba[2], 10),
    a: rgba[3] !== undefined ? parseFloat(rgba[3]) : 1,
  };
}

function isBright(color) {
  const { r, g, b, a } = getRGBComponents(color);
  // Calculate luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b ?? 1;
  // Consider transparency
  if (a < 0.5) {
    return true;
  }
  return luminance > 186; // Bright if luminance > 186
}

function displayColor(color, id) {
  const divContainer = document.createElement("div");
  divContainer.innerHTML = color;
  divContainer.className = "div_color_container";
  divContainer.style.backgroundColor = color;
  divContainer.style.cssText = `
      color: ${isBright(color) ? "black" : "white"};
      background-color: ${color};
      padding: 5px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    `;
  divContainer.addEventListener("click", function () {
    navigator.clipboard.writeText(color);
  });
  document.getElementById(id).append(divContainer);
}

const appendColors = (uniqueTextStyles) => {
  // Create table
  const table = document.createElement("table");
  table.id = "fonts_table";
  const headerRow = document.createElement("tr");
  const headers = [
    // "Free text",
    "Tag Name",
    "Font Size",
    "Line Height",
    "Font Family",
  ];
  headers.forEach((headerText) => {
    const header = document.createElement("th");
    header.textContent = headerText;
    headerRow.appendChild(header);
  });

  table.appendChild(headerRow);

  uniqueTextStyles.forEach((style) => {
    const row = document.createElement("tr");
    // const { tagName, fontSize, lineHeight, fontFamily } = style;
    // const cell = document.createElement("td");
    // cell.textContent = "Hello World";
    // cell.contentEditable = "true";
    // cell.style.cssText = `
    //   font-size: ${fontSize};
    //   line-height: ${lineHeight};
    //   font-family: ${fontFamily};
    // `;
    // row.appendChild(cell);

    Object.values(style).forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  const container = document.getElementById("fonts");
  container.appendChild(table);
};

startup();
