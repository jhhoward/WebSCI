var MoveCountType = {
	Uninitialized : 0,
	IgnoreMoveCount : 1,
	IncrementMoveCount : 2
};

var GameFeatures = (function() {
    var moveCountType = MoveCountType.Uninitialized;
    
    var detectMoveCountType = function() {
    	if (moveCountType == MoveCountType.Uninitialized) {
            // SCI0/SCI01 games always increment move count
            if (getSciVersion() <= SciVersion.SCI_VERSION_01) {
                moveCountType = MoveCountType.IncrementMoveCount;
            } else if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
                // SCI1.1 and newer games always ignore move count
                moveCountType = MoveCountType.IgnoreMoveCount;
            } else {
                if (!autoDetectMoveCountType()) {
                    Debug.error("Move count autodetection failed");
                    moveCountType = MoveCountType.IncrementMoveCount;	// Most games do this, so best guess
                }
            }
        }
    
        return moveCountType;
    }

    var handleMoveCount = function() {
        return detectMoveCountType() == MoveCountType.IncrementMoveCount;
    }
    
    var usesOldGfxFunctions = function() {
        // TODO
        return false;
    }

    return {
        handleMoveCount : handleMoveCount,
        usesOldGfxFunctions : usesOldGfxFunctions
    }
})();