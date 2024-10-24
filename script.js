function mouseDown() {
    document.getElementById("myname").textContent = "கௌரிசங்கர்";
    document.getElementById("language").value = "ENGLISH"
}

function mouseUp() {
    document.getElementById("myname").textContent = "Gowri Shankar";
    document.getElementById("language").value = "தமிழ்";
}

function SaveContact(){
    var name = document.getElementById("entername").value;
    var email = document.getElementById("enteremail").value;
    var textareas = document.getElementById("entertext").value;
}