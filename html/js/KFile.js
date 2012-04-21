var fileHandles = {};
var handleSeekPosition = {};
var nextFileHandle = 1;

function kFOpen(args) {
    var filename = SegManager.derefString(args[0]);
    var mode = args[1].toUint16();
    
    filename = ResourceManager.resourcePath + filename;
    Debug.log("FOpen() " + filename + " mode " + mode);

    if(!FileLoader.isLoaded(filename)) {
        FileLoader.loadText(filename, function() {});
        throw VM_LOAD_STALL;
    }
    else {
        fileHandles[nextFileHandle] = filename;
        handleSeekPosition[nextFileHandle] = 0;
        return new Reg(0, nextFileHandle++);
    }
}

function kFGets(args) {
	var maxsize = args[1].toUint16();
	var handle = args[2].toUint16();

    var data = FileLoader.getFile(fileHandles[handle]);

    SegManager.memcpy(args[0], data, maxsize);
	var readBytes = data.length;
	if(readBytes > maxsize)
	    readBytes = maxsize;
	    
	Debug.log(SegManager.derefString(args[0]));

	return readBytes != 0 ? args[0] : new Reg(0, 0);
}


function kFClose(args) {
    return VM.state.acc;
}

function kGetSaveDir(args) {
    return SegManager.getSaveDirPtr().clone();
}

function kGetCWD(args) {
	SegManager.strcpy(args[0], "/");

	return args[0];
}

