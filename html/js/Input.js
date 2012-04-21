var Input = (function() {
    var inputEvents = [];
    var pressedKeys = [];
    var mouseX = 0;
    var mouseY = 0;
    
    var onKeyDown = function(event) {
        pressedKeys[event.keyCode] = true;
        inputEvents.push(event);
    };
    var onKeyUp = function(event) {
        pressedKeys[event.keyCode] = false;
        inputEvents.push(event);
    };
    
    function onMouseDown(event) {
        inputEvents.push(event);
    }

    function onMouseUp(event) {
        inputEvents.push(event);
    }
    
    function onMouseMove(event) {
        // Convert from real screen to 320x200:
        mouseX = parseInt(event.offsetX * 320 / 640);
        mouseY = parseInt(event.offsetY * 200 / 400);
    }

    
    return {
        left : 37,
        up : 38,
        right : 39,
        down : 40,
        
        init : function() {
            document.onkeydown = onKeyDown;
            document.onkeyup = onKeyUp;
            
            var pageCanvasElement = Screen.getPageCanvas();
            pageCanvasElement.addEventListener('mousedown', onMouseDown, false);
            pageCanvasElement.addEventListener('mouseup', onMouseUp, false);
            pageCanvasElement.addEventListener('mousemove', onMouseMove, false);
        },
        
        getEvent : function() {
            if(inputEvents.length > 0) {
                var ev = inputEvents.shift();
                return ev;
            }
            return null;
        },
        
        getKey : function(keyCode) {
            if(typeof pressedKeys[keyCode] != 'undefined') {
                return pressedKeys[keyCode];
            }
            return false;
        },
        
        getMousePosition : function() { 
            return { x : mouseX, y : mouseY };
        }
    };
})();