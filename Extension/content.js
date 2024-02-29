chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureHTML") {
      const htmlContent = document.documentElement.outerHTML;
      console.log(htmlContent); // Log the HTML content or process it as needed
      sendResponse({html: htmlContent}); // Send the HTML content back to the popup
    }
    return true; 
  });