Browser Ponies
==============

TODO: Usage documentation.

Desktop Ponies INI Syntax
-------------------------

The "ini" format used by Desktop Ponies is similar to CSV, but not quite.
Files can have a unicode byte order mark (BOM) in order to indicate the
file encoding.

### Generic BNF

	Comment      := RegExp(^\s*'.*) EOL
	Record       := Value { "," Value } EOL
	Value        := String | QuotedString | Array
	String       := RegExp([^",{}]*)
	QuotedString := RegExp("[^"]*")
	Array        := "{" Value { "," Value } "}"
	EOL          := RegExp(\r?\n) | EOF

Example:

	' Comment Line
	Foo,"Bar, Baz",,42
	Egg,{"Bacon","Spam"}

### Conventions

The first value of each line specifies the record type. Strings can never
contain a double quote (") and the case of all values including file names is
ignored. Empty strings for references to other records are null-references.
Boolean values are represented as "True" and "False".

TODO: Finish documentation.

### Pony.ini

#### Value Types

Everything is case independant and `"FooBar"` might also be written as `"foo_bar"`.

##### Enum AllowedMove

 * None
 * HorizontalOnly
 * VerticalOnly
 * HorizontalVertical
 * DiagonalOnly
 * DiagonalHorizontal
 * DiagonalVertical
 * All
 * MouseOver
 * Sleep
 * Dragged

##### Enum Location

 * Top
 * Bottom
 * Left
 * Right
 * BottomRight
 * BottomLeft
 * TopRight
 * TopLeft
 * Center
 * Any
 * AnyNotCenter

##### Point

A point is represented as a string of two comma separated integers.

	Point := Integer "," Integer

For bug compatibility reasons the value "0,0" has to be interpreted as "no value given"
and thus the default value of `new Point(Width/2, Height/2)` has to be used.

#### Record Types

 * Name
 * BehaviorGroup
 * Behavior
 * Effect
 * Speak
 * Categories

#### Name

	Type As "Name",
	Name As String

Declares the name of the pony. There has to be exactly one Name record in
a Pony.ini file.

Example:

	Name,Rainbow Dash

#### BehaviorGroup

	Type As "BehaviorGroup",
	Id As UInteger,
	Name As String

#### Behavior

	Type As "Behavior",
	Name As String,
	Probability As Double,
	MaxDuration As Double,
	MinDuration As Double,
	Speed As Double,
	RightImage As String,
	LeftImage As String,
	Movement As AllowedMove,
	Optional LinkedBehavior As String = "",
	Optional SpeakStart As String = "",
	Optional SpeakEnd As String = "",
	Optional Skip As Boolean = False,
	Optional X As Double = 0,
	Optional Y As Double = 0,
	Optional Follow As String = "",
	Optional AutoSelectImages As Boolean = False,
	Optional Stopped As String = "",
	Optional Moving As String = "",
	Optional RightCenter As Point = new Point(Width/2, Height/2),
	Optional LeftCenter As Point = new Point(Width/2, Height/2),
	Optional RepeatAnimation As Boolean = True,
	Optional BehaviorGroup As Integer = 0

#### Effect

	Type As "Effect",
	Name As String,
	Behavior As String,
	RightImage As String,
	LeftImage As String,
	Duration As Double,
	Delay As Double,
	RightLocation As Location,
	RightCenter As Location,
	LeftLocation As Location,
	LeftCenter As Location,
	Follow As Boolean,
	Optional RepeatAnimation As Boolean = True

#### Speak

	Type As "Speak",
	Text As String

Or

	Type As "Speak",
	Name As String,
	Text As String,
	Optional File As String = "" Or String(),
	Optional Skip As Boolean = False,
	Optional BehaviorGroup As Integer = 0


#### Categories

	Type As "Categories",
	Categories As String...

### Interactions.ini

	Name As String,
	Pony As String,
	Probability As Double,
	Proximity As Double Or "default",
	Targets As String(),
	TargetActivation As Enum("One", "Any", "All"),
	Behaviors As String(),
	Optional Delay As Double = 0
