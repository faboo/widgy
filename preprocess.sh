#!/bin/bash

if [ "$1" = "--help" ]
then
	echo usage: preprocessor.sh /source/dir /output/dir [index.html]
	echo
	echo If an index file is not provided, either index.html or index.htm will be used.
	exit 0
fi

widgyDir=$(echo $0 | sed -e "s/\/preprocess.sh/\/src/")
sourceDir=$1
outputDir=$2
indexFile=$3
templates=()
modules=()

# Find index HTML file
if [ -n "$indexFile" ]
then
	if [ ! -e "$indexFile" ]
	then
		echo Provided index file does not exist: \""$indexFile"\"
		exit 1
	fi
else
	if [ -e "$1/index.html" ]
	then indexFile=$1/index.html
	elif [ -e "$1/index.htm" ]
	then indexFile=$1/index.htm
	else
		echo Unable to find an index file
		exit 1
	fi
fi

indexName=$(echo "$indexFile" | sed -e 's/^.*\///')

echo Using Widgy directory: $widgyDir
echo Using project source directory: $sourceDir
echo Using project output directory: $outputDir
echo Using index HTML file: $indexFile
echo "                     : $indexName"

function notTemplate(){
	needle=$1

	for item in "${templates[@]}"
	do
		if [ "$item" = "$needle" ]
		then return 1
		fi
	done

	return 0
}

function startIndexFile(){
	flagPattern='WIDGY:PRE'
	grep -q -e "$flagPattern" $indexFile
	hasFlag=$?

	if [ ! $hasFlag ]
	then
		flagPattern='<head>'
	fi

	sed -n -e "1,/$flagPattern/p" $indexFile > "$outputDir/$indexName"
}

function finishIndexFile(){
	flagPattern='WIDGY:PRE'
	grep -q -e "$flagPattern" $indexFile
	hasFlag=$?

	if [ ! $hasFlag ]
	then
		flagPattern='<head>'
	fi

	sed -e "1,/$flagPattern/ d" $indexFile >> "$outputDir/$indexName"
}

function copyToOutput(){
	source=$1
	dest=$(echo $source | sed -e "s/^$sourceDir/$outputDir/")

	if notTemplate "$source"
	then 
		echo Copying $source
		cp $source $dest
	else echo $source is template
	fi
}

function writeTemplate(){
	templateFile=$1
	templateId="widgy-template-"$(echo $templateFile | sed -e 's/.html$//' -e 's/^.*\///')

	echo Writing template $templateFile

	templates+=($templateFile)

	# Write appropriate template header
	echo "<template id=\"$templateId\">" >> "$outputDir/$indexName"
	# Write the rest of the template, skipping the template header
	sed -e '/^<template.*$/ d' $templateFile >> "$outputDir/$indexName"
	#sed -n -e '2,$ p' $templateFile >> "$outputDir/$indexName"
}

function processSourceDirectory(){
	dir=$1
	srcre=$(echo $sourceDir | sed -e 's/\//\\\//')

	echo Processing directory $dir
	mkdir -p $(echo $dir | sed -e "s/^$sourceDir/$outputDir/")

	for file in $dir/*
	do
		if [ -d "$file" ]
		then
			processSourceDirectory "$file"
		elif [ "$file" = "$indexFile" ]
		then
			echo "Skipping index file"
		else
			# Preload module files
			if (echo $file | grep -q -e .js\$) && grep -q -e '^import\|^export' "$file"
			then
				moduleName=$(echo $file | sed -e "s/^$srcre\\///")
				echo $moduleName is a module
				modules+=($moduleName)
			fi
			# See if this HTML file as an associated controller (and is therefore a template)
			if echo $file | grep -q -e .html\$
			then
				controllerFile=$(echo $file | sed -e 's/.html$/.js/')
				if [ -e "$controllerFile" ]
				then writeTemplate $file
				fi
			fi

			copyToOutput "$file"
		fi
	done
}

function writeModuleLinks(){
	echo Writing module links

	for file in "${modules[@]}"
	do
		echo Writing link $file
		echo "<link href=\"$file\" rel=\"modulepreload\" />" >> "$outputDir/$indexName"
	done
}

mkdir -p "$outputDir"

startIndexFile

processSourceDirectory "$sourceDir"

writeModuleLinks

finishIndexFile

echo Done.
