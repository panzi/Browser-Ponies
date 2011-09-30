#!/usr/bin/env python

import re
import os
import sys
import chardet
import codecs

EOL = re.compile('\r?\n')
DELIM = re.compile('[,}]')
ESCCH = re.compile('[,{}\'\\s]')

class BaseRow(object):
	pass

class Comment(BaseRow):
	__slots__ = 'text',

	def __init__(self,text):
		self.text = text
	
	def __str__(self):
		return "'"+self.text
	
	def __unicode__(self):
		return u"'"+self.text

def escape(s):
	if isinstance(s,list):
		return '{%s}' % ','.join(escape(x) for x in s)
	elif '"' in s:
		raise ValueError("illegal character in string: "+repr(s))
	elif ESCCH.search(s):
		return '"%s"' % s
	else:
		return s

class Row(BaseRow):
	__slots__ = 'values',
	
	def __init__(self,values):
		self.values = values
	
	def __str__(self):
		return ','.join(escape(value) for value in self.values)
	
	def __unicode__(self):
		return u','.join(escape(value) for value in self.values)

def parse_ini(text):
	rows = []
	for line in EOL.split(text):
		i = skipws(line,0)
		if line[0:1] == "'":
			row = Comment(line[1:])
		else:
			i, row = parse_line(line,i)
			if i < len(line):
				print >> sys.stderr, "trailing text:",line[i:]
			row = Row(row)
		rows.append(row)
	return rows

def skipws(s,i):
	while s[i:i+1].isspace():
		i += 1
	return i

def parse_line(line,i):
	row = []
	n = len(line)
	while True:
		i = skipws(line,i)
		if i >= n:
			break
		ch = line[i]
		if ch == '"':
			j = line.find('"',i+1)
			if j < 0: j = n
			row.append(line[i+1:j])
			i = j
			ch = line[i:i+1]
			if ch == '"':
				i = skipws(line,i+1)
				if i < n:
					ch = line[i:i+1]
					if ch == ',':
						i += 1
					elif ch != '}':
						print >> sys.stderr, 'data after quoted string:',line[i:]
			else:
				print >> sys.stderr, 'unterminated quoted string'

		elif ch == ',':
			i += 1
			row.append(u'')

		elif ch == '{':
			i, nested = parse_line(line,i+1)
			row.append(nested)
			i = skipws(line,i)
			ch = line[i:i+1]
			if ch == '}':
				i = skipws(line,i+1)
				if i < n:
					ch = line[i:i+1]
					if ch == ',':
						i += 1
					elif ch != '}':
						print >> sys.stderr, 'data after list:',line[i:]

			else:
				print >> sys.stderr, 'unterminated list'

		elif ch == '}' or ch == '\n':
			return i, row

		elif ch == '\r' and line[i+1:i+2] == '\n':
			return i+1, row

		else:
			m = DELIM.search(line,i)
			if m:
				j = m.start()
			else:
				j = n
			row.append(line[i:j].strip())
			i = j
			if i < n:
				ch = line[i]
				if ch == ',':
					i += 1
				elif ch != '}':
					print >> sys.stderr, 'syntax error:',line[i:]

	return i, row

CODEC = re.compile("^BOM_(.*?)(?:_(?:BE|LE))?$")
BOMS = list(set(unicode(getattr(codecs, name),CODEC.match(name).group(1))
	for name in dir(codecs) if name.startswith('BOM_UTF')))
BOMS.sort(key=lambda bom:-len(bom))

def decode(s):
	s = unicode(s,chardet.detect(s)['encoding'])
	for bom in BOMS:
		if s.startswith(bom):
			s = s[len(bom):]
			break
	return s

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
				with open(filepath,'rb') as f:
					s = decode(f.read())
				buf = []
				for row in parse_ini(s):
					if type(row) is Row and row.values:
						type_name = row.values[0].lower()
						if type_name == 'behavior':
							row.values[6] = row.values[6].lower()
							row.values[7] = row.values[7].lower()
						elif type_name == 'effect':
							row.values[3] = row.values[3].lower()
							row.values[4] = row.values[4].lower()
						elif type_name == 'speak' and len(row.values) > 3:
							row.values[3] = row.values[3].lower()
					buf.append(unicode(row))
				s = u'\n'.join(buf)
				with open(filepath,'wb') as f:
					f.write(s.encode('utf-8'))

def main():
	dirs = sys.argv[1:]
	if not dirs:
		dirs = [u'.']
	for directory in dirs:
		repair_names(unicode(directory))

if __name__ == '__main__':
	main()
