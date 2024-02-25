document.addEventListener('DOMContentLoaded', () => {
  const snapshotButton = document.getElementById('snapshot-button');
  const snapshotImage = document.getElementById('snapshot-image');
  const resultText = document.createElement('p');
  const apiTokenInput = document.getElementById('api-token'); 
  
  document.body.appendChild(resultText);

  snapshotButton.addEventListener('click', async () => {
    try {
      const apiToken = apiTokenInput.value; 
      if (!apiToken) {
        throw new Error('Please enter your API Token');
      }

      const dataUrl = await captureVisibleTab();
      snapshotImage.src = dataUrl;
      snapshotImage.alt = 'Website Snapshot';

      const blob = await dataUrlToBlob(dataUrl);
      const uploadResult = await uploadImage(blob);

      const openAIResponse = await analyzeImageWithOpenAI(uploadResult.url, apiToken); 
      resultText.textContent = openAIResponse.choices[0].message.content;
    } catch (error) {
      console.error(error);
      resultText.textContent = error.message;
    }
  });
});

async function captureVisibleTab() {
  console.log('Capturing the visible tab...');
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, dataUrl => {
      if (chrome.runtime.lastError) {
        reject(new Error('Error capturing tab: ' + chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl);
      }
    });
  });
}

async function dataUrlToBlob(dataUrl) {
  console.log('Converting Data URL to Blob...');
  return fetch(dataUrl).then(res => res.blob());
}

async function uploadImage(blob) {
  console.log('Uploading image to server...');
  const formData = new FormData();
  formData.append('image', blob, 'screenshot.png');

  try {
    const response = await fetch('https://dark-pattern-detection-extension-myekke.vercel.app/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      // Log the response status and statusText
      console.error('Upload failed:', response.status, response.statusText);
      // Attempt to parse and log the server response to help with debugging
      const text = await response.text();
      console.error('Server response:', text);
      throw new Error('Upload failed: ' + response.statusText);
    }
    
    console.log('Image uploaded successfully.');
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(error);
    throw error; // Re-throw the error to be handled by the calling function
  }
}

async function analyzeImageWithOpenAI(imageUrl, apiToken) {
  console.log('Sending image URL to OpenAI for analysis...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          "role": "user",
          "content": [
            {"type": "text", "text": "What’s in this image?"},
            {"type": "image_url", "image_url": imageUrl}
          ]
        }
      ],
      max_tokens: 300
    })
  });
  console.log('Analysis received from OpenAI.');
  return response.json();
}
