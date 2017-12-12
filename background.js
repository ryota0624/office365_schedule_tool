let headers = null;
let lastUpdate = null;

chrome.webRequest.onCompleted.addListener((details) => {
  // if (lastUpdate === null || Date.now() > (lastUpdate + 60000)) {
    console.log("start request")
    if (isCalendarUrl(details.url)) {
      lastUpdate = Date.now();
      chrome.cookies.getAll({}, (d)  => {
        const domains = d.filter(a => a.domain.match(/office365/));
      });
      
      chrome.tabs.executeScript(details.tabId, {
        code: `fetch("${details.url}&su=su",
        {credentials: "include" ,method: "POST", headers: ${JSON.stringify(headers)} })
          .then(res => res.json())
          .then(json => {
            chrome.runtime.sendMessage({json, type: "su-tasks"})
          });`
      });
    }
  //}
},
  {urls: ['<all_urls>']},
  []
);
chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (isCalendarUrl(details.url)) {
    headers = details.requestHeaders.map(({name, value}) => ({[name]: value})).reduce((acc, ccc) => Object.assign({}, acc, ccc) , {});
  }
},{urls: ['<all_urls>']}, ["requestHeaders"])

chrome.runtime.onMessage.addListener(message => {  
  if (message.type === "su-tasks") {
    receiveTask(message.json.Body.Items);    
  }
});

function receiveTask(rawTasks) {
  function dateDuration(a, b) {
    return (new Date(a)).getTime() - (new Date(b)).getTime();
  }

  function dateToSlashFormat(date) {
    return ((new Date(date)).getMonth() + 1) + "/" + (new Date(date)).getDate();
  }
  const tasks = rawTasks
  .map(({Start, End, Subject}) => ({ startTime: Start, endTime: End, subject: Subject }))
  .map(({subject, startTime, endTime}) => ({date: dateToSlashFormat(startTime), endTime, startTime, subject, duration: dateDuration(endTime, startTime)}))

  taskStore = tasks
  kickChangeStoreCallbacks();
}

let taskStore = null;

function isCalendarUrl(url) {
  return url.match(/GetCalendarView/) && url.match(/su=su/) === null;
}

function groupByMonth() {
  let taskMonthMap = {};
  if (taskStore === null) return null; 
  taskStore.forEach(task => {
    const yearMonth = getDateYM((new Date(task.startTime)));
    if (taskMonthMap[yearMonth] === undefined) {
      Object.assign(taskMonthMap, {[yearMonth]: [] });
    } else {
      Object.assign(taskMonthMap, {[yearMonth]: taskMonthMap[yearMonth].concat(task) });
    }
  });
  return taskMonthMap;
}

function getAllTasks() {
  return taskStore;
}

function onChangeStore(callback) {
  changeStoreCallbacks.push(callback);
}

function kickChangeStoreCallbacks() {
  changeStoreCallbacks = changeStoreCallbacks.filter((cb) => {
    if (cb) {
      cb();
      true;
    } else {
      false;
    }
  })
}

let changeStoreCallbacks = [];

function getDateYM(dt){
  let y = dt.getFullYear();
  let m = ("00" + (dt.getMonth()+1)).slice(-2);
  var result = y + "/" + m;
  return result;
}