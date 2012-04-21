var currentCursor = null;

function Cursor(image, data) {
    this.image = image;
    this.data = data;
}

function kSetCursor(args) {
//    console.log("Setting cursor");
    if(args[1].offset != 0) {
        currentCursor = ResourceManager.loadCursor(args[0].offset);
        
        if(currentCursor == null) {
            throw VM_LOAD_STALL;
        }
    }
    else currentCursor = null;
    
    return VM.state.acc;
}