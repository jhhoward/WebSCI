var SCI_TEXT16_ALIGNMENT_RIGHT = -1
var SCI_TEXT16_ALIGNMENT_CENTER = 1
var SCI_TEXT16_ALIGNMENT_LEFT = 0

function Font(image, data) {
    this.image = image;
    this.data = data;
}

Font.prototype = {
    drawString : function(string, x, y) {
        for(var c = 0; c<string.length; c++) {
            
        }
    }
};

var GfxText = (function() {
    var font = null;

    function init() {
        
    }
    
    function getFontId() {
    	return GfxPorts.getPort().fontId;
    }
    
    function getFont() {
    }
    
    function setFont(fontId) {
    }

	function codeProcessing(text, orgFontId, orgPenColor, doingDrawing) {
	}

	function clearChar(chr) {
	}

	function getLongest(text, maxWidth, orgFontId) {
	}
	
	function width(text, from, len, orgFontId, textWidth, textHeight, restoreFont) {
	}
	
	function stringWidth(str, orgFontId, textWidth, textHeight) {
	}
	
	function showString(str, orgFontId, orgPenColor) {}
	function drawString(str, orgFontId, orgPenColor) {}
	function size(rect, text, fontId, maxWidth) {}
	function draw(text, from, len, orgFontId, orgPenColor) {}
	function show(text, from, len, orgFontId, orgPenColor) {}
	function box(text, show, rect, alignment, fontId) {}
	function drawString(text) {}
	function drawStatus(text) {}

	function allocAndFillReferenceRectArray() {}

	function kernelTextSize(text, font, maxWidth, textWidth, textHeight) {}
	function kernelTextFonts(args) {}
	function kernelTextColors(args) {}
    

    return {
        init : init,
        getFontId : getFontId,
        setFont : setFont
    };
})();