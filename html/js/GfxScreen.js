var EGApalette = [
    [0x000,  0x000,  0x000],
    [0x000,  0x000,  0x0AA],
	[0x000,  0x0AA,  0x000],
	[0x000,  0x0AA,  0x0AA],
	[0x0AA,  0x000,  0x000],
	[0x0AA,  0x000,  0x0AA],
	[0x0AA,  0x055,  0x000],
	[0x0AA,  0x0AA,  0x0AA],
	[0x055,  0x055,  0x055],
	[0x055,  0x055,  0x0FF],
	[0x055,  0x0FF,  0x055],
	[0x055,  0x0FF,  0x0FF],
	[0x0FF,  0x055,  0x055],
	[0x0FF,  0x055,  0x0FF],
	[0x0FF,  0x0FF,  0x055],
	[0x0FF,  0x0FF,  0x0FF]   
];

var GfxScreen = (function() {
    var picLayers = [];
//    var viewLayers = [];
    var controlLayer;
    var priorityLayer;
    var picLayer;
    
    var createLayer = function() {
        var canvas = document.createElement("canvas");
        canvas.width = "320";
        canvas.height = "200";
        
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, 320, 200);
        
        return { 
            image : canvas,
            context : context
        };
    }
    
    var init = function() {
        controlLayer = createLayer();
        priorityLayer = createLayer();
        picLayer = createLayer();
    }
    
    var getLayer = function(array, priority) {
        if(typeof array[priority] == 'undefined') {
            array[priority] = createLayer();
        }
        
        return array[priority];
    }
    
    var getPicLayer = function(priority) {
        return getLayer(picLayers, priority);
    }

    var getViewLayer = function(priority) {
        //return getLayer(viewLayers, priority);
    }

    var drawPic = function(picImage) {
        for(var x = 0; x<16; x++) {
            getPicLayer(x).context.clearRect(0, 0, 320, 200);
            getPicLayer(x).context.drawImage(picImage, x * 320, 0, 320, 200, 0, 0, 320, 200);
            picLayer.context.drawImage(picImage, x * 320, 0, 320, 200, 0, 0, 320, 200);
        }
        
        controlLayer.context.drawImage(picImage, 16 * 320, 0, 320, 200, 0, 0, 320, 200);
        Screen.getContext().drawImage(picLayer.image, 0, 0);
        Screen.updateRect(new Rect(0, 0, 320, 200));
    }
    
    var restorePic = function(rect, priority) {
        var clipped = rect.clone();
        clipped.clip(new Rect(0, 0, 320, 200));
        
        if(clipped.width() <= 0 || clipped.height() <= 0)
            return;
    
        if(typeof priority == 'undefined') {
            Screen.getContext().drawImage(picLayer.image, clipped.left, clipped.top, 
                                clipped.width(), clipped.height(), clipped.left, clipped.top,
                                clipped.width(), clipped.height());
        }
        else {
            while(priority < picLayers.length) {
                Screen.getContext().drawImage(getPicLayer(priority).image, clipped.left, clipped.top, 
                                clipped.width(), clipped.height(), clipped.left, clipped.top,
                                clipped.width(), clipped.height());
            
                priority ++;
            }
        }
    }
    
    var render = function() {
        /*var screenContext = Screen.getContext();
        
        for(var x = 0; x<16; x++) {
            screenContext.drawImage(getPicLayer(x).image, 0, 0);    
            screenContext.drawImage(getViewLayer(x).image, 0, 0);    
        }*/
    }
    
    var clearViews = function() {
        /*for(var x in viewLayers) {
            viewLayers[x].context.clearRect(0, 0, 320, 200);
        }*/
    }
    
    function getPixel(canvas, x, y) {
        var data = canvas.getImageData(x, y, 1, 1).data;
        return new Color([data[0], data[1], data[2]]);
    }
    
    function getPixelValue(canvas, x, y) {
        var data = canvas.getImageData(x, y, 1, 1).data;
        
        for(var x = 0; x<EGApalette.length; x++) {
            if(data[0] == EGApalette[x][0]
            && data[1] == EGApalette[x][1]
            && data[2] == EGApalette[x][2])
                return x;
        }
        
        Debug.error("Invalid pixel value!");
        return 0;
    }
    
    function getPriority(x, y) {
        return 0;
    }
    
    function getControl(x, y) {
        return getPixelValue(controlLayer.context, x, y);
    }

    return {
        init : init,
        drawPic : drawPic,
        clearViews : clearViews,
        getPicLayer : getPicLayer,
        getViewLayer : getViewLayer,
        render : render,
        picNotValid : true,
        getPriority : getPriority,
        getControl : getControl,
        restorePic : restorePic
    };
})();