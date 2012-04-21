#!/bin/bash
INPUT_PATH=$1
OUTPUT_PATH=$2

if [ "$INPUT_PATH" == '' ]; then
    echo "Usage: $0 INPUT_PATH OUTPUT_PATH"
    exit 1
fi
if [ "$OUTPUT_PATH" == '' ]; then
    echo "Usage: $0 INPUT_PATH OUTPUT_PATH"
    exit 1
fi

CURSOR_FILES=$INPUT_PATH/cursor.*
SCRIPT_FILES=$INPUT_PATH/script.*
VOCAB_FILES=$INPUT_PATH/vocab.*
VIEW_FILES=$INPUT_PATH/view.*
FONT_FILES=$INPUT_PATH/font.*
PIC_FILES=$INPUT_PATH/pic.???.v.bmp

for f in $PIC_FILES
do
    FILENAME=`basename $f`
    BASEFILE=${FILENAME%.v.*}
    
    ./processor/processor -pic -o $OUTPUT_PATH/$BASEFILE.png $INPUT_PATH/$BASEFILE 
done

for f in $CURSOR_FILES
do
    FILENAME=`basename $f`
    echo "Processing $FILENAME"
    ./processor/processor -cursor -o $OUTPUT_PATH/$FILENAME $f 
done

for f in $SCRIPT_FILES
do
    FILENAME=`basename $f`
    echo "Processing $FILENAME"
    openssl base64 -in $f -out $OUTPUT_PATH/$FILENAME.b64
done

for f in $VOCAB_FILES
do
    FILENAME=`basename $f`
    echo "Processing $FILENAME"
    openssl base64 -in $f -out $OUTPUT_PATH/$FILENAME.b64
done

for f in $VIEW_FILES
do
    FILENAME=`basename $f`
    ./processor/processor -view -o $OUTPUT_PATH/$FILENAME $f 
done

for f in $FONT_FILES
do
    FILENAME=`basename $f`
    ./processor/processor -font -o $OUTPUT_PATH/$FILENAME $f 
done
