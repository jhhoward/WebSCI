function kGetFarText(args) {
    var textData = ResourceManager.loadText(args[0].toUint16());
    
    if(textData == null) {
        throw VM_LOAD_STALL;
    }

	var counter = args[1].toUint16();
	var str = "";

    for(var x = 0; x<textData.length; x++) {
        var c = textData.charCodeAt(x);
        
        if(c == 0) {
            if(counter == 0)
                break;
            counter --;
        }
        else if(counter == 0) {
            str = str + String.fromCharCode(c);
        }
    }
    
    Debug.log("String number " + args[1].toUint16() + " is " + str);

	// If the third argument is NULL, allocate memory for the destination. This
	// occurs in SCI1 Mac games. The memory will later be freed by the game's
	// scripts.
	if (args[2].isNull())
		args[2].set(SegManager.allocDynmem(str.length + 1, "Mac FarText"));

	SegManager.strcpy(args[2], str); // Copy the string and get return value
	return args[2];
}
