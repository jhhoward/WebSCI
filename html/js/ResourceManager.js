var ResourceType = {
    View : 0x0, 
    Pic : 0x1, 
    Script : 0x2, 
    Text : 0x3,
	Sound : 0x4, 
	Memory : 0x5, 
	Vocab : 0x6, 
	Font : 0x7,
	Cursor : 0x8, 
	Patch : 0x9, 
	Bitmap : 0xA, 
	Palette : 0xB,
	CdAudio : 0xC, 
	Audio : 0xD, 
	Sync : 0xE, 
	Message : 0xF,    
	Map : 0x10, 
	Heap : 0x11, 
	Audio36 : 0x12, 
	Sync36 : 0x13,  
	Translation : 0x14
};

var ResourceManager = (function() {
    var RESOURCE_PENDING = 'RESOURCE_PENDING';
    var resourcePath = "demodata/";
    var loadedScripts = {};
    var loadedCursors = {};
    var loadedFonts = {};
    var loadedViews = {};

    var loadResource = function(url, onLoad) {
        FileLoader.loadBase64(resourcePath + url, function(resourceData) {
            onLoad(resourceData);
        });
    }
    
    var generateResourcePath = function(resourceName, resourceNum) {
        var prefixedNum = resourceNum.toString();
        while(prefixedNum.length < 3) {
            prefixedNum = "0" + prefixedNum;
        }
        return  resourcePath + resourceName + "." + prefixedNum;
    }
    
    var generateScriptPath = function(scriptNum) {
        return generateResourcePath("script", scriptNum) + ".b64";
    }
    
    var isScriptLoaded = function(scriptNum) {
        return loadedScripts[scriptNum] instanceof Script;
    }
    
    var isScriptLoading = function(scriptNum) {
        return loadedScripts[scriptNum] == RESOURCE_PENDING;
    }
    
    var loadCursor = function(cursorNum) {
        if(loadedCursors[cursorNum] instanceof Cursor)
            return loadedCursors[cursorNum];
        if(loadedCursors[cursorNum] == RESOURCE_PENDING)
            return null;
            
        loadedCursors[cursorNum] = RESOURCE_PENDING;
        
        var cursorPath = generateResourcePath("cursor", cursorNum);
        FileLoader.loadImage(cursorPath + ".png", function(cursorImage) {
           FileLoader.loadJSON(cursorPath + ".json", function(cursorData) {
                var newCursor = new Cursor(cursorImage, cursorData);
                loadedCursors[cursorNum] = newCursor;
           });
        });
        
        
        return null;
    }

    var loadView = function(viewNum) {
        if(loadedViews[viewNum] instanceof View)
            return loadedViews[viewNum];
        if(loadedViews[viewNum] == RESOURCE_PENDING)
            return null;
            
        loadedViews[viewNum] = RESOURCE_PENDING;
        
        var viewPath = generateResourcePath("view", viewNum);
        FileLoader.loadImage(viewPath + ".png", function(viewImage) {
           FileLoader.loadJSON(viewPath + ".json", function(viewData) {
                var newView = new View(viewImage, viewData);
                loadedViews[viewNum] = newView;
           });
        });
        
        
        return null;
    }

    var loadFont = function(fontNum) {
        if(loadedFonts[fontNum] instanceof Font)
            return loadedFonts[fontNum];
        if(loadedFonts[fontNum] == RESOURCE_PENDING)
            return null;
            
        loadedFonts[fontNum] = RESOURCE_PENDING;
        
        var fontPath = generateResourcePath("font", fontNum);
        FileLoader.loadImage(fontPath + ".png", function(fontImage) {
           FileLoader.loadJSON(fontPath + ".json", function(fontData) {
                var newFont = new Font(viewImage, viewData);
                loadedFonts[fontNum] = newFont;
           });
        });
        
        
        return null;
    }

    var loadText = function(textNum) {
        var textPath = generateResourcePath("text", textNum);
        
        if(FileLoader.isLoaded(textPath)) {
            return FileLoader.getFile(textPath).substr(2);
        }
        else {
            FileLoader.loadText(textPath, function() {});
        }
        
        return null;
    }

    var loadPic = function(picNum) {
        var picPath = generateResourcePath("pic", picNum) + ".png";
        
        if(FileLoader.isLoaded(picPath)) {
            return FileLoader.getFile(picPath);
        }
        else {
            FileLoader.loadImage(picPath, function() {});
        }
        
        return null;
    }

    var loadScript = function(scriptNum, loadDependencies) {
        if(typeof loadDependencies == 'undefined')
            loadDependencies = true;
        
        if(isScriptLoaded(scriptNum)) {
            return loadedScripts[scriptNum];
        }
        else if(isScriptLoading(scriptNum)) {
            return null;
        }
        else {
            loadedScripts[scriptNum] = RESOURCE_PENDING;
            FileLoader.loadBase64(generateScriptPath(scriptNum),
                function(scriptData) {
                    var newScript = new Script(scriptNum, scriptData);
                    loadedScripts[scriptNum] = newScript;
                    
                    if(loadDependencies) {
                        var dependencies = newScript.calculateScriptDependencies();
                        for(var d in dependencies) {
                            if(!isScriptLoaded(d) && !isScriptLoading(d)) {
                                loadScript(d, function() {}, loadDependencies);
                            }
                        }
                        
                        FileLoader.onLoadingFinished.addOnce(function() {
                            newScript.init();
                        }, true);
                    }
                    else {
                        newScript.init();
                    }
                });
        }
        return null;
    }
    
    

    return {
        // Public members
        resourcePath : resourcePath,
        loadCursor : loadCursor,
        loadScript : loadScript,
        loadResource : loadResource,
        loadPic : loadPic,
        loadText : loadText,
        loadFont : loadFont,
        loadView : loadView,
        load : function(url, onLoad) {
            FileLoader.loadBase64(url, function(scriptData) {
                var newScript = new Script(0, scriptData);
                
                Engine.run();
            });   
        }
    };
})();

