// chrome.browserAction.onClicked.addListener();

window.onload = () => { 
  var taskStrings = chrome.extension.getBackgroundPage().getTaskStrings();
  if (taskStrings !== null) {
    const content = document.getElementById("content");
    const list = document.createElement("div");
    list.innerHTML = taskStrings.map(str => `<div>${str}</div>`).join("");
    content.appendChild(list);
  }
}