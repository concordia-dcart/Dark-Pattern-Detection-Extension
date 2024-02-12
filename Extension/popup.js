document.addEventListener('DOMContentLoaded', () => {
  const snapshotButton = document.getElementById('snapshot-button');
  const snapshotImage = document.getElementById('snapshot-image');
  const resultText = document.createElement('p'); // Create a paragraph to display the result
  document.body.appendChild(resultText); // Append the result text to the body or a specific container

  snapshotButton.addEventListener('click', () => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      snapshotImage.src = dataUrl;
      snapshotImage.alt = 'Website Snapshot';

      // Convert Data URL to a Blob
      const blob = await fetch(dataUrl).then(res => res.blob());

      // Create FormData to send the image file
      const formData = new FormData();
      formData.append('image', blob, 'screenshot.png');

      // Upload the image to the server
      try {
        const uploadResponse = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData
        });
        const uploadResult = await uploadResponse.json();

        // If the upload is successful, get the image URL from the server
        if (uploadResponse.ok) {
          const accessibleImageUrl = uploadResult.url;
          
          // Send the image URL to OpenAI for analysis
          const openAIResponse = await analyzeImageWithOpenAI(accessibleImageUrl);
          
          // Assuming the response has a property `text` containing the analysis
          resultText.textContent = openAIResponse.choices[0].message.content;
        } else {
          throw new Error(uploadResult.error);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        resultText.textContent = 'Failed to upload image.';
      }
    });
  });
});

// Function to analyze the image using OpenAI's API
async function analyzeImageWithOpenAI(imageUrl) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': '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' // Replace with your actual API key
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          "role": "user",
          "content": [
            {"type": "text", "text": "What’s in this image?"},
            {
              "type": "image_url",
              "image_url": {
                "url": imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 300
    })
  });
  return response.json(); // Parse the JSON response
}
