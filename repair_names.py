#!/usr/bin/env python

import os
import argparse

from ponylib import Row, parse_file

def repair_names(directory):
	for path, dirs, files in os.walk(directory):
		for subdir in dirs:
			subpath = os.path.join(path,subdir)
			for entry in os.listdir(subpath):
				lower_entry = entry.lower()
				if lower_entry != entry:
					print 'renaming',subpath,entry,'->',lower_entry
					os.rename(
						os.path.join(path,subdir,entry),
						os.path.join(path,subdir,lower_entry))
		for filename in files:
			if filename.lower() == 'pony.ini':
				filepath = os.path.join(path,filename)
				print 'repairing',filepath
				buf = []
				for row in parse_file(filepath):
					if type(row) is Row and row.values:
						type_name = row.values[0].lower()
						if type_name == 'behavior':
							row.values[6] = row.values[6].lower()
							row.values[7] = row.values[7].lower()
						elif type_name == 'effect':
							row.values[3] = row.values[3].lower()
							row.values[4] = row.values[4].lower()
						elif type_name == 'speak' and len(row.values) > 3:
							audio = row.values[3]
							if isinstance(audio,list):
								row.values[3] = [filename.lower() for filename in audio]
							else:
								row.values[3] = audio.lower()
					buf.append(unicode(row))
				s = u'\n'.join(buf)
				with open(filepath,'wb') as f:
					f.write(s.encode('utf-8'))

def main():
	parser = argparse.ArgumentParser(
		description="Ensure all file names and file name references are lower case.")
	parser.add_argument("directories",metavar="DIR",nargs="*",
		help='Directories to recursively search for Pony.ini files. (default: ".")')
	args = parser.parse_args()

	dirs = args.directories
	if not dirs:
		dirs = [u'.']
	for directory in dirs:
		repair_names(unicode(directory))

if __name__ == '__main__':
	main()
