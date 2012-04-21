var RefTest = {
    arr : [ 
        { x : 5, y : 6 },
        { x : 10, y : 2 }
    ],
    ptr : 0
};

var WebSCI = (function() {
    // Private members
    var frameRate = 60;
    
    var update = function() {
        if(FileLoader.finishedLoading()) {
            Engine.update();
        }
    };
        
    return {
        // Public members
        init : function() {
            setInterval(update, 1000 / frameRate);

            Engine.init();
            
            var canvasElement = document.getElementById("canvas");
            canvasElement.style.cursor = "none";
        },
    };

})();


