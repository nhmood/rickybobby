console.log("rickybobby v1.0");


document.addEventListener("DOMContentLoaded", function(){
  document.body.classList.remove("preload");
});


let searchButton = document.getElementById("searchButton");
if (searchButton){ searchButton.addEventListener("click", searchUsers); }

function searchUsers(){
  let userA = document.getElementById("userA");
  let userB = document.getElementById("userB");

  let usernameA = userA.value.toLowerCase();
  let usernameB = userB.value.toLowerCase();

  let searchURL = `/shakeandbake?users=${usernameA},${usernameB}`;
  window.location.href = searchURL;
}
