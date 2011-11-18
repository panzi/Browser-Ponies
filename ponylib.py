import sys
import re
import chardet
import codecs

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

EOL = re.compile('\r?\n')
DELIM = re.compile('[,}]')
ESCCH = re.compile('[,{}\'\\s]')

class BaseRow(object):
	__slots__ = 'lineno',
	def __init__(self,lineno):
		self.lineno = lineno

class Comment(BaseRow):
	__slots__ = 'text',

	def __init__(self,lineno,text):
		BaseRow.__init__(self,lineno)
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
	
	def __init__(self,lineno,values):
		BaseRow.__init__(self,lineno)
		self.values = values
	
	def __str__(self):
		return ','.join(escape(value) for value in self.values)
	
	def __unicode__(self):
		return u','.join(escape(value) for value in self.values)
	
	def __getitem__(self,index):
		if len(self.values) <= index:
			return None
		else:
			return self.values[index]
	
	def __len__(self):
		return len(self.values)
	
	def __iter__(self):
		return iter(self.values)

def parse_string(text,comments=True):
	rows = []
	for lineno, line in enumerate(EOL.split(text)):
		i = skipws(line,0)
		if line[0:1] == "'":
			if not comments: continue
			row = Comment(lineno+1,line[1:])
		else:
			i, row = parse_line(line,i)
			if i < len(line):
				print >> sys.stderr, "trailing text:", line[i:]
			row = Row(lineno+1,row)
		rows.append(row)
	return rows

def parse_file(filename,comments=True):
	with open(filename,'rb') as f:
		return parse_stream(f,comments)

def parse_stream(stream,comments=True):
	return parse_string(decode(stream.read()),comments)

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
