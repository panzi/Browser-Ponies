#!/usr/bin/env python

import os
import sys
import re
import shutil
import argparse

from itertools import izip, imap, repeat
from functools import partial

from ponylib import parse_file

JUNK = re.compile('[-_\\s]',re.M)

def Float(self,value):
	try:
		float(value)
	except ValueError:
		return False
	except TypeError:
		return False
	else:
		return True

def Int(self,value):
	try:
		int(value,10)
	except ValueError:
		return False
	except TypeError:
		return False
	else:
		return True

def Bool(self,value):
	return value.lower() in ('true', 'false')

def File(self,filename):
	if isinstance(filename,(str,unicode)):
		self.files.add(filename)
		return os.path.isfile(os.path.join(self.dirpath,filename))	
	return False

def Point(self,value):
	value = value.split(',')
	if len(value) != 2:
		return False
	return Int(self,value[0]) and Int(self,value[1])

def String(self,value):
	return isinstance(value,(str,unicode))

def List(self,value):
	return isinstance(value,list)

def Empty(self,value):
	return not value

def named(name):
	def deco(f):
		f.func_name = name
		return f
	return deco

def name_of(obj):
	if hasattr(obj,'__name__'):
		return obj.__name__
	elif hasattr(obj,'func_name'):
		return obj.func_name
	else:
		return str(obj)

def Not(validator):
	@named("Not(%s)" % name_of(validator))
	def _Not(self,value):
		return not validator(self,value)
	return _Not

def All(*validators):
	@named("All(%s)" % ','.join(name_of(validator) for validator in validators))
	def _All(self,value):
		for validator in validators:
			if not validator(self,value):
				return False
		return True
	return _All

def Any(*validators):
	@named("Any(%s)" % ','.join(name_of(validator) for validator in validators))
	def _Any(self,value):
		for validator in validators:
			if validator(self,value):
				return True
		return False
	return _Any

def Range(parse,start,end):
	@named("Range(%s,%r,%r)" % (name_of(parse), start, end))
	def _Range(self,value):
		try:
			num = parse(value)
		except ValueError:
			return False
		except TypeError:
			return False
		else:
			return start <= num and num < end
	return _Range

def InclusiveRange(parse,start,end):
	@named("InclusiveRange(%s,%r,%r)" % (name_of(parse), start, end))
	def _Range(self,value):
		try:
			num = parse(value)
		except ValueError:
			return False
		except TypeError:
			return False
		else:
			return start <= num and num <= end
	return _Range

def Min(parse,minvalue):
	@named("Min(%s,%r)" % (name_of(parse), minvalue))
	def _Min(self,value):
		try:
			num = parse(value)
		except ValueError:
			return False
		except TypeError:
			return False
		else:
			return minvalue <= num
	return _Min

def Max(parse,maxvalue):
	@named("Max(%s,%r)" % (name_of(parse), maxvalue))
	def _Max(self,value):
		try:
			num = parse(value)
		except ValueError:
			return False
		except TypeError:
			return False
		else:
			return num <= maxvalue
	return _Max

def ListOf(validator):
	@named("ListOf(%s)" % name_of(validator))
	def _ListOf(self,value):
		if not isinstance(value,list):
			return False
		return all(imap(partial(validator,self),value))
	return _ListOf

def Enum(*values):
	name = "Enum(%s)" % ','.join(repr(name_of(value)) for value in values)
	values = frozenset(v.lower() for v in values)
	@named(name)
	def _Enum(self,value):
		return JUNK.sub('', value).lower() in values
	del name
	return _Enum

IntMin      = partial(Min,int)
IntMax      = partial(Max,int)
FloatMin    = partial(Min,float)
FloatMax    = partial(Max,float)
EmptyString = named('EmptyString')(All(String,Empty))
PositiveFloat = named('PositiveFloat')(FloatMin(0.0))
NegativeFloat = named('NegativeFloat')(FloatMax(0.0))
PositiveInt = named('PositiveInt')(IntMin(0.0))
NegativeInt = named('NegativeInt')(IntMax(0.0))
NonEmptyString = named('NonEmptyString')(All(String,Not(Empty)))

class Behavior(object):
	def __init__(self,row):
		self.lineno     = row.lineno
		self.name       = row[1]
		self.linked     = row[9].lower()  if row[9]  else None
		self.speakstart = row[10].lower() if row[10] else None
		self.speakend   = row[11].lower() if row[11] else None

		if self.linked == "none":
			self.linked = None

class Effect(object):
	def __init__(self,row):
		self.lineno   = row.lineno
		self.name     = row[1]
		self.behavior = row[2].lower()

class Validator(object):
	def __init__(self,filepath,remove_not_referenced=False):
		filepath = os.path.abspath(filepath)
		self.filepath = filepath
		self.dirpath  = os.path.dirname(filepath)
		self.remove_not_referenced = remove_not_referenced
		self.behaviors_by_name = {}
		self.behaviors  = []
		self.speeches   = set()
		self.categories = None
		self.effects    = []
		self.name       = None
		self.files      = set()
		self.files.add(os.path.split(filepath)[1])

	def validate(self):
		ok = True
		for row in parse_file(self.filepath,False):
			if not self.validate_row(row):
				ok = False

		if not self.name:
			self.log("name is not defined")
			ok = False

		if not self.categories:
			self.log("categories are not defined")
			ok = False

		for behavior in self.behaviors:
			linked = behavior.linked
			if linked and linked not in self.behaviors_by_name:
				self.log_behavior(behavior,"linked behavior does not exist:",linked)
				ok = False

			speakstart = behavior.speakstart
			if speakstart and speakstart not in self.speeches:
				self.log_behavior(behavior,"start speak line does not exist:",speakstart)
				ok = False

			speakend = behavior.speakend
			if speakend and speakend not in self.speeches:
				self.log_behavior(behavior,"start speak line does not exist:",speakend)
				ok = False

		for effect in self.effects:
			if effect.behavior not in self.behaviors_by_name:
				self.log_effect(effect,"behavior does not exist:",effect.behavior)
				ok = False

		filenames = os.listdir(self.dirpath)
		filenames.sort()
		for filename in filenames:
			if filename not in self.files:
				if self.remove_not_referenced:
					filepath = os.path.join(self.dirpath,filename)
					if os.path.isdir(filepath):
						shutil.rmtree(filepath)
						self.log("removed not referenced directory:",filename)
					else:
						os.remove(filepath)
						self.log("removed not referenced file:",filename)
				else:
					self.log("not referenced file:",filename)
				ok = False

		return ok

	def validate_row(self,row):
		if len(row) < 1:
			# ignore empty lines
			return True
		type_name = row[0].lower()
		values = row.values[1:]
		if type_name in VALIDATORS:
			errors = []
			possible_validators = VALIDATORS[type_name]
			for validators in possible_validators:
				del errors[:]
				for i, (validator, value) in enumerate(izip(validators,values)):
					if not validator(self,value):
						errors.append("illegal value at index %d: %s (expected %s)" % (i, value, name_of(validator)))
				if isinstance(validators,list) and len(validators) < len(values):
					errors.append("too many values. expected %d but got %d" % (len(validators), len(values)))
				if not errors:
					break
			if errors:
				for error in errors:
					self.log_row(row,error)
				return False
			else:
				return getattr(self,'validate_'+type_name)(row)
		else:
			self.log_index(row,0,"unknown type:",type_name)
			return False

	def validate_name(self,row):
		ok = True
		if self.name is not None:
			self.log_index(row,1,"name is already defined")
			ok = False

		self.name = row[1]
		return ok
		
	def validate_behavior(self,row):
		behavior = Behavior(row)
		ok = True
		if behavior.name in self.behaviors_by_name:
			self.log_behavior(behavior,"name is not unique")
			ok = False
		else:
			self.behaviors_by_name[behavior.name.lower()] = behavior
		self.behaviors.append(behavior)
		return ok
	
	def validate_effect(self,row):
		self.effects.append(Effect(row))
		return True
		
	def validate_speak(self,row):
		ok = True
		if len(row) > 2:
			name = row[1].lower()
			if name in self.speeches:
				self.log_row(row,"speak line name is not unique:",row[1])
				ok = False
			else:
				self.speeches.add(name)
		return ok

	def validate_categories(self,row):
		ok = True
		if self.categories is not None:
			self.log_row(row,"categories are already defined")
			ok = False
		self.categories = frozenset(row.values[1:])
		return ok

	def log(self,*msg):
		sys.stderr.write("%s: %s\n" % (self.filepath, ' '.join(msg)))

	def log_line(self,lineno,*msg):
		sys.stderr.write("%s:%d: %s\n" % (self.filepath, lineno, ' '.join(msg)))
	
	def log_row(self,row,*msg):
		self.log_line(row.lineno,*msg)
	
	def log_behavior(self,behavior,*msg):
		self.log_line(behavior.lineno,"behavior %s:" % behavior.name,*msg)

	def log_effect(self,effect,*msg):
		self.log_line(effect.lineno,"effect %s:" % effect.name,*msg)

	def log_index(self,row,index,*msg):
		sys.stderr.write("%s:%d:[%d]: %s\n" % (self.filepath, row.lineno, index, ' '.join(msg)))

Direction = named('Direction')(Enum('Left','Right','Up','Down','UpLeft','UpRight','DownLeft','DownRight'))
Movement = named('Movement')(Enum('None','HorizontalOnly','VerticalOnly','HorizontalVertical','DiagonalOnly',
	'DiagonalHorizontal','DiagonalVertical','All','MouseOver','Sleep','Dragged'))
Location = named('Location')(Enum('Top','Bottom','Left','Right','BottomRight','BottomLeft','TopRight',
	'TopLeft','Center','Any','AnyNotCenter'))

FileOrFileList = named('FileOrFileList')(Any(EmptyString,File,ListOf(File)))

VALIDATORS = {
	"name":       [[NonEmptyString]],
	"behavior":   [[String,InclusiveRange(float,0.0,1.0),PositiveFloat,PositiveFloat,Float,File,File,Movement,
	               String,String,String,Bool,Float,Float,String,
	               Bool,String,String,
	               Point,Point]],
	"effect":     [[NonEmptyString,NonEmptyString,File,File,PositiveFloat,PositiveFloat,Location,Location,
	               Location,Location,Bool]],
	"speak":      [[NonEmptyString,Bool], [NonEmptyString,NonEmptyString,FileOrFileList,Bool]],
	"categories": [repeat(NonEmptyString)]
}

def main():
	parser = argparse.ArgumentParser(description="Validate Pony.ini files")
	parser.add_argument("files",metavar="FILE",nargs="*",help="Pony.ini files to validate")
	parser.add_argument("-r","--remove-not-referenced",action="store_true",
		help="Remove files not referenced in the Pony.ini files.")
	args = parser.parse_args()

	ok = True
	for filename in args.files:
		if not Validator(filename,remove_not_referenced=args.remove_not_referenced).validate():
			ok = False
	if ok:
		return 0
	else:
		return 1

if __name__ == '__main__':
	sys.exit(main())
