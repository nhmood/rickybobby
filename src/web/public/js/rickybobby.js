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



let userSearch = document.querySelector("input#userSearch");
if (userSearch){
  userSearch.addEventListener("keyup", searchRiders);
}

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

  if (substr.length == 0){
    el.parentElement.querySelector(".suggestions").innerHTML = '';
    return;
  }

  searchTimer = setTimeout(function(e){
    queryUsername(el, substr, updateSuggestions);
  }, 100);
}


function searchRiders(e){
  let el = e.target;
  let substr = e.target.value;
  clearTimeout(searchTimer);

  if (substr.length == 0){
    document.querySelector(".searchResults").innerHTML = '';
    document.querySelector(".riders").classList.remove("hide");
    return;
  }

  searchTimer = setTimeout(function(e){
    queryUsername(el, substr, updateRiders);
  }, 100);
}



function queryUsername(el, user, callback){
  fetch('/api/v1/users/search', {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: user})
  }).then(e => e.json())
    .then(e => {
      callback(el, e);
    });
}

function updateSuggestions(el, results){
  let suggestions = el.parentElement.querySelector(".suggestions");

  if (results.length == 0){
    suggestions.innerHTML = '';
    return;
  }

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
    div.dataset.id = r.id;
    div.dataset.type = 'user';
    div.classList.add("row");
    div.addEventListener("click", function(){
      el.value = r.username;
      suggestions.innerHTML = '';
    });

    div.innerHTML = suggestion;
    suggestions.appendChild(div);
  });
}



function chunk(data, chunkSize){
  let chunks = [];
  // Start the chunk with -1 so the "group" clause increments on
  // start to index 0
  for (let index = 0, chunk = -1; index < data.length; index++){
    if (index % chunkSize == 0){
      chunk++;
    }

    // Grab the chunk and initialize the array if new, then append the data
    chunks[chunk] = chunks[chunk] || [];
    chunks[chunk].push(data[index])
  }

  return chunks;
}

function updateRiders(el, results){
  document.querySelector(".riders").classList.add("hide");
  let riders = document.querySelector(".searchResults");
  riders.classList.remove("hide");

  riders.innerHTML = '';
  if (results.length == 0){
    return;
  }

  results = chunk(results, 4);
  results.forEach(group => {

    let r = document.createElement("div");
    r.classList.add("row");

    group.forEach(user => {
      let d = document.createElement("div");
      d.dataset.id = user.id;
      d.dataset.type = 'user';
      d.classList.add("three");
      d.classList.add("columns");
      d.classList.add("user-list");

      let s = `
      <div class="row">
        <img class="u-full-width profile-list" src="${user.image_url}"></img>
      </div>
      <div class="row">
        <a href="/users/${user.username}">${user.username}</a>
      </div>
      `;

      d.innerHTML = s;
      r.appendChild(d);
    });

    riders.appendChild(r);
  });
}
