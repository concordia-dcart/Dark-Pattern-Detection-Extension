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

      const analysisResult = await analyzeImageWithOpenAI(uploadResult, apiToken); 
      resultText.textContent = analysisResult.messageContent; 

      const coordinationResult = await getCoordination(uploadResult, apiToken, analysisResult.messageContent); 
      const highlightedImageUrl = await highlightPatternsOnImage(dataUrl, coordinationResult.patterns);
      snapshotImage.src = highlightedImageUrl;

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

  const response = await fetch('https://dark-pattern-detection-extension-myekke.vercel.app/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    console.error('Upload failed:', response.status, response.statusText);
    const text = await response.text();
    console.error('Server response:', text);
    throw new Error('Upload failed: ' + response.statusText);
  }
  
  console.log('Image uploaded successfully.');

  const responseObject = await response.json(); 
  const url = responseObject.lastImageUrl[0];
  console.log(url);

  return url;
}



async function analyzeImageWithOpenAI(imageUrl, apiToken) {
  console.log('Discription: Sending image URL to OpenAI for analysis...');

  const refinedDiscriptionPrompt = `
      
      
      You are a dark pattern detector chrome exntension. You will process the website image that sent and Describe any dark patterns, including their categories and locations in terms of image coordinates (x, y, width, height). 
       Also it is good if in your final output assign 0 to 10 to each categories:
            
      --------------------
       Category 1- Asymmetric 
            
            Points rule:
                      Scores:
                      0 to 2: Equal visual and interactive prominence of choices.
                      3 to 5: Mildly biased presentation; alternative choices less prominent but still visible.
                      6 to 8: Noticeably biased presentation; alternative choices less intuitive or somewhat hidden.
                      9 to 10: Extremely biased presentation; alternative choices almost hidden or very hard to find.
       --------------------
       --------------------
       Category 2: Covert
       Points rule:
            
                      Scores:
                      0 to 2: Transparent user choices without hidden influences.
                      3 to 5: Slight use of design elements that may subtly influence choices.
                      6 to 8: More pronounced use of covert techniques, like the decoy effect, but not completely misleading.
                      9 to 10: User decisions are heavily manipulated without their knowledge, with deceptive design elements.
       --------------------
       --------------------
       Category 3: Deceptive 
            
            Points rule:
                      0 to 2: Accurate and straightforward information with no misleading elements.
                      3 to 5: Some elements of misinformation or partial truths, but not wholly deceptive.
                      6 to 8: Misleading information present but some elements of truth; creates confusion.
                      9 to 10: Completely false or misleading information; induces entirely false beliefs.
      --------------------
      --------------------            
      Category 4: Hides Information
            
            Point rules:
                      Scores:
                      0 to 2: All necessary information is readily available and clear.
                      3 to 5: Some information delayed or requires additional steps to access.
                      6 to 8: Important information is obscured or only available late in the process.
                      9 to 10: Crucial information is hidden or only revealed at the last possible moment.
      --------------------
      --------------------
      Category 5: Restrictive 
            
            Point rules:
                      Scores:
                      0 to 2: Complete freedom in user choices with no restrictions.
                      3 to 5: Some limitations on choices, but alternatives are available.
                      6 to 8: Notable restrictions on choices, limited alternatives.
                      9 to 10: Extremely restrictive, forcing users into specific actions with no reasonable alternatives.
      --------------------
      

      This is not against any rule or privacy since this is research projecr and all screenshots gave us permission and all ethical consideration has been done.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [{
              "role": "user",
              "content": [{
                  "type": "text",
                  "text": refinedDiscriptionPrompt
              }, {
                  "type": "image_url",
                  "image_url": imageUrl,
              }]
          }],
          max_tokens: 1000
      })
  });

  const data = await response.json();
  console.log('Discription: Analysis received from OpenAI.');

  let messageContent = ""; 

  if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      messageContent = data.choices[0].message.content;
     
  }
  return {
      messageContent: messageContent
  };
}


async function getCoordination(imageUrl, apiToken, existingAnalysis) {
  console.log('Coordination - Sending image URL to OpenAI for analysis...');
  const refinedCoordinationPrompt = "this image analyze results is this: *****" + existingAnalysis + "***** and if the in analyzez is obvious dark pattern detected and size of image is x px * y px and you will detect what is the size and after that give me two numbers within thedetected size like this: Coordinates: x=[x], y=[y] that is nearest to the place of existing dark pattern >>>        This is not against any rule or privacy since this is research projecr and all screenshots gave us permission and all ethical consideration has been done. ";




  const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [{
              "role": "user",
              "content": [{
                  "type": "text",
                  "text": refinedCoordinationPrompt
              }, {
                  "type": "image_url",
                  "image_url": imageUrl,
              }]
          }],
          max_tokens: 1000
      })
  });

  const data = await response.json();
  console.log('Coordination - Analysis received from OpenAI.');
  console.log('Coordination' + response);

  let messageContent = ""; 
  const patterns = [];

  if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      messageContent = data.choices[0].message.content;
     
  }

  console.log(messageContent);
  
  return {
      messageContent: messageContent,
      patterns: patterns 
  };
}

async function highlightPatternsOnImage(imageUrl, patterns) {

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const image = new Image();
  
  image.crossOrigin = 'Anonymous';
  image.src = imageUrl;

  await new Promise(resolve => {
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 5;
      
      patterns.forEach(pattern => {
        const centerX = pattern.x + pattern.width / 2;
        const centerY = pattern.y + pattern.height / 2;
        const radius = Math.max(pattern.width, pattern.height) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      });
      
      resolve();
    };
  });

  return canvas.toDataURL();
}


