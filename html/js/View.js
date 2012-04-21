var ViewScaleSignals = {
	DoScaling				: 0x0001, // enables scaling when drawing that cel (involves scaleX and scaleY)
	GlobalScaling			: 0x0002, // means that global scaling shall get applied on that cel (sets scaleX/scaleY)
	Hoyle4SpecialHandling	: 0x0004  // HOYLE4-exclusive: special handling inside kAnimate, is used when giving out cards
};

function View(image, data) {
    this.image = image;
    this.data = data;
    this.adjustForSci0Early = getSciVersion() == SciVersion.SCI_VERSION_0_EARLY ? -1 : 0;
    
    Debug.log(this.data);
}

View.prototype = {
    isScaleable : function() { return false; },
    isSci2Hires : function() { return false; },
    
/*    draw : function(loopNo, celNo, celRect, priority, paletteNo, scaleX, scaleY) {
        var celInfo = this.getCelInfo(loopNo, celNo);
//        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, 20, 20, celInfo.w, celInfo.h);
        GfxScreen.getViewLayer(priority).context.drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, celRect.left, celRect.top, celInfo.w, celInfo.h);
    },*/

    draw : function(loopNo, celNo, x, y, priority) {
        var celInfo = this.getCelInfo(loopNo, celNo);
//        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, 20, 20, celInfo.w, celInfo.h);
//        GfxScreen.getViewLayer(priority).context.drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, x, y, celInfo.w, celInfo.h);
        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, x, y, celInfo.w, celInfo.h);
    },
    
    getLoopCount : function() {
        return this.data.groups.length;
    },
    
    getCelCount : function(loopNo) {
        return this.data.groups[loopNo].cells.length;
    },
    
    getCelInfo : function(loopNo, celNo) {
        if(loopNo >= this.data.groups.length) {
            loopNo = this.data.groups.length - 1;
        }
        if(celNo >= this.data.groups[loopNo].cells.length) {
            celNo = this.data.groups[loopNo].cells.length - 1;
        }
    
        return this.data.groups[loopNo].cells[celNo];
    },
    
    getNumCels : function(loopNo) {
        return this.data.groups[loopNo].cells.length;
    },
    
    getCelRect : function(loopNo, celNo, x, y, z, outRect) {
        var celInfo = this.getCelInfo(loopNo, celNo);
        outRect.left = x + celInfo.offX - (celInfo.w >> 1);
        outRect.right = outRect.left + celInfo.w;
        outRect.bottom = y + celInfo.offY - z + 1 + this.adjustForSci0Early;
        outRect.top = outRect.bottom - celInfo.h;
    }
}
