#!/usr/bin/env python

import sys
import os
import re
import argparse

from ponylib import Row, parse_file

SPECIAL=re.compile('^.*(\(.*\))$')

def repair_names(path):
	entries = os.listdir(path)

	for entry in entries:
		lower_entry = entry.lower()
		entry_path = os.path.join(path,entry)
		if lower_entry != entry:
			print 'renaming',path,entry,'->',lower_entry
			lower_path = os.path.join(path,lower_entry)
			os.rename(entry_path, lower_path)
			entry      = lower_entry
			entry_path = lower_path

		if os.path.isdir(entry_path):
			repair_names(entry_path)
		elif lower_entry == 'pony.ini':
			print 'repairing',entry_path
			m = SPECIAL.match(os.path.basename(os.path.dirname(os.path.abspath(entry_path))))
			suffix = m and m.group(1)
			if suffix:
				suffix = " " + suffix.title()
			buf = []
			for row in parse_file(entry_path):
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
					elif suffix and type_name == 'name':
						name = row.values[1]
						if not name.endswith(suffix):
							row.values[1] = name + suffix
							print 'renamed pony',name,'->',row.values[1]
				buf.append(unicode(row))
			s = u'\n'.join(buf)
			with open(entry_path,'wb') as f:
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
	encoding = sys.getfilesystemencoding()
	for directory in dirs:
		repair_names(unicode(directory,encoding))

if __name__ == '__main__':
	main()
