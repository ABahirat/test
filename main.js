/**
Changes: vars --> let, for better scoping 

*/

function getJIRAFeed(callback, errorCallback){
    /* var is global variable, change to let */
    let user = document.getElementById("user").value;
    if(user == undefined) return;
    
    let url = "https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+"+user+"&providers=issues";
    make_request(url, "").then(function(response) {
      // empty response type allows the request.responseXML property to be returned in the makeRequest call
      callback(url, response);
    }, errorCallback);
}
/**
 * @param {string} searchTerm - Search term for JIRA Query.
 * @param {function(string)} callback - Called when the query results have been  
 *   formatted for rendering.
 * @param {function(string)} errorCallback - Called when the query or call fails.
 */
async function getQueryResults(s, callback, errorCallback) {                                                 
    try {
      let response = await make_request(s, "json");
      callback(createHTMLElementResult(response));
    } catch (error) {
      errorCallback(error);
    }
}

function make_request(url, responseType) {
  return new Promise(function(resolve, reject) {
    let req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = responseType;

    req.onload = function() {
      let response = responseType ? req.response : req.responseXML;
      if(response && response.errorMessages && response.errorMessages.length > 0){
        reject(response.errorMessages[0]);
        return;
      }
      resolve(response);
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    }
    req.onreadystatechange = function() { 
      if(req.readyState == 4 && req.status == 401) { 
          reject("You must be logged in to JIRA to see this project.");
      }
    }

    // Make the request
    req.send();
  });
}



function loadOptions(){
  chrome.storage.sync.get({
    project: 'Sunshine',
    user: 'nyx.linden'
  }, function(items) {
    document.getElementById('project').value = items.project;
    document.getElementById('user').value = items.user;
  });
}
function buildJQL(callback) {
  let callbackBase = "https://jira.secondlife.com/rest/api/2/search?jql=";
  let project = document.getElementById("project").value;
  let status = document.getElementById("statusSelect").value;
  let inStatusFor = document.getElementById("daysPast").value
  let fullCallbackUrl = callbackBase;
  fullCallbackUrl += `project=${project}+and+status=${status}+and+status+changed+to+${status}+before+-${inStatusFor}d&fields=id,status,key,assignee,summary&maxresults=100`;
  callback(fullCallbackUrl);
}
function createHTMLElementResult(response){

// 
// Create HTML output to display the search results.
// results.json in the "json_results" folder contains a sample of the API response
// hint: you may run the application as well if you fix the bug. 
// 

  return '<p>There may be results, but you must read the response and display them.</p>';
  
}

// utility 
function domify(str){
  let dom = (new DOMParser()).parseFromString('<!doctype html><body>' + str,'text/html');
  return dom.body.textContent;
}

/** change to async function since make_request will return a promise */
async function checkProjectExists(){
    try {
      return await make_request("https://jira.secondlife.com/rest/api/2/project/SUN", "json");
    } catch (errorMessage) {
      document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
      document.getElementById('status').hidden = false;
    }
}

// Setup
document.addEventListener('DOMContentLoaded', function() {
  // if logged in, setup listeners
    checkProjectExists().then(function() {
      //load saved options
      loadOptions();

      // query click handler
      document.getElementById("query").onclick = function(){
        // build query
        buildJQL(function(url) {
          document.getElementById('status').innerHTML = 'Performing JIRA search for ' + url;
          document.getElementById('status').hidden = false;  
          // perform the search
          getQueryResults(url, function(return_val) {
            // render the results
            document.getElementById('status').innerHTML = 'Query term: ' + url + '\n';
            document.getElementById('status').hidden = false;
            
            let jsonResultDiv = document.getElementById('query-result');
            jsonResultDiv.innerHTML = return_val;
            jsonResultDiv.hidden = false;

          }, function(errorMessage) {
              document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
              document.getElementById('status').hidden = false;
          });
        });
      }

      // activity feed click handler
      document.getElementById("feed").onclick = function(){   
        // get the xml feed
        getJIRAFeed(function(url, xmlDoc) {
          document.getElementById('status').innerHTML = 'Activity query: ' + url + '\n';
          document.getElementById('status').hidden = false;

          // render result
          let feed = xmlDoc.getElementsByTagName('feed');
          let entries = feed[0].getElementsByTagName("entry");
          let list = document.createElement('ul');

          for (let index = 0; index < entries.length; index++) {
            let html = entries[index].getElementsByTagName("title")[0].innerHTML;
            let updated = entries[index].getElementsByTagName("updated")[0].innerHTML;
            let item = document.createElement('li');
            item.innerHTML = new Date(updated).toLocaleString() + " - " + domify(html);
            list.appendChild(item);
          }

          let feedResultDiv = document.getElementById('query-result');
          if(list.childNodes.length > 0){
            feedResultDiv.innerHTML = list.outerHTML;
          } else {
            document.getElementById('status').innerHTML = 'There are no activity results.';
            document.getElementById('status').hidden = false;
          }
          
          feedResultDiv.hidden = false;

        }, function(errorMessage) {
          document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
          document.getElementById('status').hidden = false;
        });    
      };        

    }).catch(function(errorMessage) {
        document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
        document.getElementById('status').hidden = false;
    });   
});
