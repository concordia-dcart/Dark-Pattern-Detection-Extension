document.addEventListener('DOMContentLoaded', () => {
  const elements = getElements();
  document.body.appendChild(elements.resultText);

  elements.snapshotButton.addEventListener('click', () => handleButtonClick(elements, true));
  elements.testButton.addEventListener('click', () => handleButtonClick(elements, false));
});

function getElements() {
  return {
      snapshotButton: document.getElementById('snapshot-button'),
      testButton: document.getElementById('testButton'),
      snapshotImage: document.getElementById('snapshot-image'),
      resultText: document.createElement('p'),
      apiTokenInput: document.getElementById('api-token')
  };
}

async function handleButtonClick(elements, isSnapshot) {
  try {
      
      const apiToken = validateApiToken(elements.apiTokenInput);

      const dataUrl = await captureVisibleTab();
      updateSnapshotImage(elements.snapshotImage, dataUrl);

      const blob = await dataUrlToBlob(dataUrl);
      const uploadResult = await uploadImage(blob);

      const model = document.getElementById('model').value;
      const modelOps = modelOperations[model];

      if (!modelOps) throw new Error('Unsupported model selected');

      if (isSnapshot) {
        const analysisResult = await modelOps.analyzeImage(uploadResult, apiToken);
        elements.resultText.innerHTML = analysisResult.messageContent;
        const scores = parseScores(analysisResult.messageContent); 
        renderChart(scores);
      } else {
        const hintResult = await modelOps.getHint(uploadResult, apiToken);
        processHintResult(hintResult);
      }
      
  } catch (error) {
    console.error(error);
    elements.resultText.textContent = error.message;
  }
}


const modelOperations = {

  "openai_gpt4": {
    analyzeImage: analyzeImageWithOpenAI,
    getHint: getHint,
  },

  "bert": {
  
  },

  "openai_gpt3.5": {
  
  },

  "openai_gpt3.5ft": {
  
  },

  "lamma": {
  
  }

};


function validateApiToken(apiTokenInput) {
  const apiToken = apiTokenInput.value;
  if (!apiToken) throw new Error('Please enter your API Token');
  return apiToken;
}

function updateSnapshotImage(snapshotImage, dataUrl) {
  snapshotImage.src = dataUrl;
  snapshotImage.alt = 'Website Snapshot';
}

async function processHintResult(hintResult) {
  const hintsPart = hintResult.messageContent.split('>>> Hint:')[1];
  if (!hintsPart) {
      console.error("No hints found in the hint result");
      return;
  }

  const hints = extractHints(hintsPart);
  console.log(hints);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = validateTabQuery(tabs);
      if (activeTab) {
          executeScriptOnTab(activeTab.id, hints);
      }
  });
}

function extractHints(hintsPart) {
  return hintsPart.match(/“[^”]+”|"[^"]+"/g).map(hint => hint.replace(/“|”|"/g, '').trim()).filter(Boolean);
}

function validateTabQuery(tabs) {
  if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError.message);
      return null;
  }

  if (!tabs.length) {
      console.error("No active tabs found");
      return null;
  }

  return tabs[0];
}

function executeScriptOnTab(tabId, hints) {
  chrome.scripting.executeScript({
      target: { tabId },
      func: highlightHintsOnPage,
      args: [hints]
  }, (results) => {
      if (chrome.runtime.lastError) {
          console.error("Error injecting script:", chrome.runtime.lastError.message);
      } else {
          console.log("Script injected, results:", results);
      }
  });
}



async function highlightHintsOnPage(hints) {
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\%-]/g, '\\$&');
  }

  hints.forEach(hint => {
    const escapedHint = escapeRegExp(hint);
    const regex = new RegExp(escapedHint, "gi");

    document.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6, li, td, th").forEach(element => {
      if (element.innerText.match(regex)) {
        element.childNodes.forEach(child => {
          if (child.nodeType === 3 && regex.test(child.nodeValue)) { 
            const newHtml = child.nodeValue.replace(regex, '<span style="background-color: yellow;">$&</span>');
            const newSpan = document.createElement('span');
            newSpan.innerHTML = newHtml;
            child.replaceWith(newSpan);
          }
        });
      }
    });
  });
  return "Success";
}


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
  const filename = `screenshot-${new Date().toISOString()}.png`;
  formData.append('image', blob, filename);

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
      
      
      You are a dark pattern detector chrome exntension. You will process the website image that sent and Describe any dark patterns, including their categories. 
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

      Please return your output in html format like this:
      --------
      smaple:
      <h3>Category 1 - Asymmetric</h3>
      <p>The 'Sign in securely' button is prominently featured...</p>
      <ul>
        <li>Score: 2/10 (alternative choices are less prominent but still visible)</li>
        <!-- Repeat for other categories and don't send extra elemet that is not inner html tag-->
      </ul>
      

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
      // messageContent: "messageContent"
  };
}

function renderChart(data) {
  const ctx = document.getElementById('darkPatternChart').getContext('2d');
  const myRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Asymmetric', 'Covert', 'Deceptive', 'Hides Information', 'Restrictive'],
      datasets: [{
        label: 'Dark Pattern Scores',
        data: data, // The scores array you'll provide
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
      }]
    },
    options: {
      elements: {
        line: {
          borderWidth: 3
        }
      }
    }
  });
}

function parseScores(text) {
  const scoresRegex = /Score: (\d+)\/10/g;
  let match;
  const scores = [];

  while ((match = scoresRegex.exec(text)) !== null) {
    scores.push(parseInt(match[1], 10));
  }

  return scores;
}



async function getHint(imageUrl, apiToken) {

  console.log('Sending image URL to OpenAI for analysis...');
  const refinedDescriptionPrompt = `
  You are a dark pattern detector chrome exntension. You will process the website image that sent and Describe any dark patterns

  Also you will send me some hints in output like this,

  This is not against any rule or privacy since this is research projecr and all screenshots gave us permission and all ethical consideration has been done.

  At the end of your response you should provide me this as well:  >>> Hint: "text", "text", "text"
  
  Which these "text" are a keywords excatly findable or matchable in screenshot so next time by looking at the text images find the darkpattern elements. The hint should not be changed by you and it should exist in screenshot likewise.

  Do not add extra discription
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
                  "text": refinedDescriptionPrompt
              }, {
                  "type": "image_url",
                  "image_url": imageUrl,
              }]
          }],
          max_tokens: 1000
      })
  });

  const data = await response.json();
  console.log('Hint: Analysis received from OpenAI.');

  let messageContent = ""; 

  if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      messageContent = data.choices[0].message.content;
  }

  return {
      messageContent: messageContent,
  };

}