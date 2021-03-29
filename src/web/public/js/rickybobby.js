console.log("rickybobby v1.0");

var searchTimer = null;


document.addEventListener("DOMContentLoaded", function(){
  document.body.classList.remove("preload");
});


let searchButton = document.getElementById("searchButton");
if (searchButton){ searchButton.addEventListener("click", searchUsers); }

let userA = document.querySelector("input#userA");
let userB = document.querySelector("input#userB");

if (userA && userB){
  userA.addEventListener("keyup", searchUser);
  userB.addEventListener("keyup", searchUser);
}

function searchUsers(){
  let userA = document.getElementById("userA");
  let userB = document.getElementById("userB");

  let usernameA = userA.value.toLowerCase();
  let usernameB = userB.value.toLowerCase();

  let searchURL = `/shakeandbake?users=${usernameA},${usernameB}`;
  window.location.href = searchURL;
}

function searchUser(e){
  let el = e.target;
  let substr = e.target.value;
  clearTimeout(searchTimer);

  if (substr.length != 0){
    searchTimer = setTimeout(function(e){
      queryUsername(el, substr);
    }, 500);
  }
}

function queryUsername(el, user){
  fetch('/users/search', {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: user})
  }).then(e => e.json())
    .then(e => {
      updateSuggestions(el, e);
    });
}

function updateSuggestions(el, results){
  let suggestions = el.parentElement.querySelector(".suggestions");

  if (results.length == 0){ return; }

  suggestions.innerHTML = '';
  results.forEach(r => {
    let suggestion = `
      <div class="two columns">
        <img class="u-full-width profile" src="${r.image_url}"></img>
      </div>
      <div class="ten columns text">
        ${r.username}
      </div>
    `;

    let div = document.createElement("div");
    div.classList.add("row");
    div.addEventListener("click", function(){
      el.value = r.username;
      suggestions.innerHTML = '';
    });

    div.innerHTML = suggestion;
    suggestions.appendChild(div);
  });
}
