var GfxScreenMasks = {
	VISUAL		: 1,
	PRIORITY	: 2,
	CONTROL		: 4,
	DISPLAY		: 8, // not official sierra sci, only used internally
	ALL			: 1|2|4
};

var Screen = (function() {
    var pageCanvasElement = null;           // The page canvas
    var pageContext = null;
    var pageCanvasWidth = 320;
    var pageCanvasHeight = 200;
    
    var internalCanvas = null;              // The buffer that the game draws to
    var internalContext = null;
    
    var hudCanvas = null;
    var hudContext = null;
    
    var loadingImage = null;
    
    var mouseX = 0;
    var mouseY = 0;
    
    var getCanvasContext = function(element) {
        if (element.getContext) {
            return element.getContext("2d");
        }
        else return null;    
    };
    
    var init = function() {
        pageCanvasElement = document.getElementById("canvas");
        pageContext = pageCanvasElement.getContext("2d");
        pageCanvasElement.cursor = 'none';
        
        pageCanvasElement.style.width = "640px";
        pageCanvasElement.style.height = "480px";
        
        internalCanvas = document.createElement("canvas");
        internalCanvas.width = "320";
        internalCanvas.height = "200";
//        document.body.appendChild(internalCanvas);
        
        internalContext = internalCanvas.getContext("2d");
        
        internalContext.fillStyle = "rgb(255, 0, 255)";
        internalContext.fillRect(0, 0, 320, 200);

        hudCanvas = document.createElement("canvas");
        hudCanvas.width = "320";
        hudCanvas.height = "200";
        hudContext = hudCanvas.getContext("2d");
        
        FileLoader.loadImage("img/loading.png", function(image) {
            loadingImage = image;
            console.log(image);
        });

    }
    
    var clear = function(context) {
  //      context.setTransform(1, 0, 0, 1, 0, 0);   
//        context.fillStyle = "rgb(0, 0, 0)";
  //      context.fillRect(0, 0, 320, 200);
//        context.
    }
    
    var render = function() {
       // clear();
        /*hudContext.clearRect(0, 0, 320, 200);

        if(!FileLoader.finishedLoading() && loadingImage != null) {        
            hudContext.drawImage(loadingImage, 320 - 17, 200 - 17);
        }
        
        if(currentCursor != null) {
            var mousePosition = Input.getMousePosition();
            hudContext.drawImage(currentCursor.image, mousePosition.x, mousePosition.y);
        }
*/
                
/*        internalContext.strokeStyle = "rgb(255, 255, 255)";
        internalContext.strokeRect(mouseX, mouseY, 16, 16);
  */      
        //pageContext.drawImage(internalCanvas, 0, 0, 320, 200, 0, 0, pageCanvasWidth, pageCanvasHeight);
        //pageContext.drawImage(hudCanvas, 0, 0, 320, 200, 0, 0, pageCanvasWidth, pageCanvasHeight);
        
    }
    
    function convertRectCoordinates(rect) {
        var output = rect.clone();
        output.top = parseInt(output.top * pageCanvasHeight / 200);
        output.left = parseInt(output.left * pageCanvasWidth / 320);
        output.bottom = parseInt(output.bottom * pageCanvasHeight / 200);
        output.right = parseInt(output.right * pageCanvasWidth / 320);
        
//        output.clip(new Rect(0, 0, pageCanvasWidth, pageCanvasHeight));
        return output;
    }
    
    function updateRect(rect) {
        rect = rect.clone();
        rect.clip(new Rect(0, 0, 320, 200));
        
        if(rect.width() <= 0 || rect.height() <= 0)
            return;
            
        var outputRect = convertRectCoordinates(rect);

        pageContext.drawImage(internalCanvas, rect.left, rect.top, rect.width(), rect.height(), outputRect.left, outputRect.top, outputRect.width(), outputRect.height());
    }
    
    return {
        init : init,
        clear : clear,
        render : render,
        updateRect : updateRect,
        getContext : function() { return internalContext; },
        getPageCanvas : function() { return pageCanvasElement; },
        width : 320,
        height : 200
    };

})();

