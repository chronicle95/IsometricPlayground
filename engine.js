
	const TEXTURE = 32;
	const FONT_SCALE = 1/16;
	const BLOCK_SCALE1 = 1/4;
	const BLOCK_SCALE2 = 1/8;
	const BLOCK_SCALE3 = 1/16;

	var Orientation = {
		"north": 0,
		"east": 1,
		"south": 2,
		"west": 3
	};

	var BlockType = {
		"pointer": 0,
		"grass": 1,
		"redstone": 2,
		"torch": 3,
		"switch": 4,
		"button": 5
	};

	var TexturesByType = {};
	for (var t in BlockType) {
		TexturesByType[BlockType[t]] = new Image();
		TexturesByType[BlockType[t]].src = "rp_" + t + ".png";
	}

	var Block = function(type, stateLevel, orientation) {
		this.type = type;
		this.stateLevel = stateLevel;
		this.orientation = orientation;
		
		this.getType = function() {
			return this.type;
		};

		this.rotate = function() {
			this.orientation = (this.orientation + 1) % 4;
		};

		this.render = function(context, coords, sf) {
			var sX = 0;
			var sY = 0;
			if (sf === undefined) sf = 1;
			if (this.type != "pointer" && this.type != "grass") {
				sX = this.stateLevel * TEXTURE;
				sY = this.orientation * TEXTURE;
			}
			context.drawImage(TexturesByType[this.getType()], sX, sY, TEXTURE, TEXTURE, coords.getScrX(sf), coords.getScrY(sf), TEXTURE * sf, TEXTURE * sf);
		};
	};

	var Scale = function(availableScales) {
		this.selection = availableScales;
		this.currentIndex = 0;

		this.getNextScale = function() {
			this.currentIndex = (this.currentIndex + 1) % this.selection.length;
			return this.selection[this.currentIndex];
		};
	};

	var Coords = function(x, y, z) {
		this.getScrX = function(sf) {
			if (sf === undefined) sf = 1;
			return (this.x*TEXTURE/2 + this.y*TEXTURE/2) * sf;
		};
		this.getScrY = function(sf) {
			if (sf === undefined) sf = 1;
			return (this.x*TEXTURE/4 - this.y*TEXTURE/4 - this.z*TEXTURE/2) * sf;
		};
		this.move = function(direction) {
			switch (direction) {
				case Orientation.north:
					this.y += 1;
					break;
				case Orientation.south:
					this.y -= 1;
					break;
				case Orientation.west:
					this.x -= 1;
					break;
				case Orientation.east:
					this.x += 1;
					break;
			}
		};
		this.zmove = function(direction) {
			switch (direction) {
				case Orientation.north:
				case Orientation.east:
					this.z += 1;
					break;
				case Orientation.south:
				case Orientation.west:
					this.z -= 1;
					break;
			}
		};

		if (x instanceof Coords) {
			this.x = x.x;
			this.y = x.y;
			this.z = x.z;
		} else {
			this.x = x;
			this.y = y;
			this.z = z;
		}
	};

	function evalBlock(world, coords) {
		let block = world.blocks[coords.x][coords.y][coords.z];
		switch (block.getType()) {
			case BlockType.grass:
				break;
			case BlockType.redstone:
				break;
			case BlockType.torch:
				break;
			case BlockType.switch:
				break;
			case BlockType.button:
				break;
		}
	}
	
	function doesAoverlapB(a, b) {
		return ((a.x == b.x+1 || a.y == b.y-1) && (a.z == b.z || a.z == b.z+1)) || (a.x == b.x && a.y == b.y && a.z == b.z+1);
	}

	var Inventory = function(scale) {
		this.availableTools = ["hammer", "wrench", "zoom"];
		for (var type in BlockType) {
			if (type != "pointer")
			this.availableTools = this.availableTools.concat([type]);
		}
		this.selectedTool = 0;
		this.scale = scale;

		this.toggle = function() {
			this.selectedTool = (this.selectedTool + 1) % this.availableTools.length;
		};

		this.getSelectedTool = function() {
			return this.availableTools[this.selectedTool];
		};

		this.render = function(canvas) {
			var ctx = canvas.getContext("2d");
			ctx.fillStyle = "#000";
			let fontSize = Math.floor(canvas.height * this.scale);
			ctx.font = fontSize + "px terminal";
			ctx.fillText(this.availableTools[this.selectedTool], 4, fontSize + 2);
			ctx.fillStyle = "#ff0";
			ctx.fillText(this.availableTools[this.selectedTool], 3, fontSize);
		};
	};

	var World = function(bscale, tscale) {
		this.blocks = {};
		this.blocks_ordered = [];
		this.pointer = new Coords(0, 0, 0);
		this.scale = bscale;
		this.textScale = tscale;

		this.setBlockScale = function(scale) {
			this.scale = scale;
		};

		this.tick = function() {
			for (var x in this.blocks) {
				for (var y in this.blocks[x]) {
					for (var z in this.blocks[x][y]) {
						evalBlock(this, new Coords(x, y, z));
					}
				}
			}
		};

		this.render = function(canvas) {
			var ctx = canvas.getContext("2d");
			let scaleFactor = canvas.width * this.scale / TEXTURE;
			let scaledTexture = TEXTURE * scaleFactor;
			ctx.imageSmoothingEnabled = false;
			ctx.fillStyle = "#fff";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.translate(canvas.width/2, canvas.height/2);
			ctx.translate(-scaledTexture/2, -scaledTexture/2);
			ctx.translate(-this.pointer.getScrX(scaleFactor), -this.pointer.getScrY(scaleFactor));
			var pointed = false;
			var pointer = new Block(BlockType.pointer, 0, Orientation.north);
			for (var i in this.blocks_ordered) {
				var coords = this.blocks_ordered[i][0];
				var block  = this.blocks_ordered[i][1];
				// the next block is going to overlap
				// the pointer, so draw the pointer first
				if (doesAoverlapB(coords, this.pointer) && !pointed) {
					pointer.render(ctx, this.pointer, scaleFactor);
					pointed = true;
				}
				// draw the block
				block.render(ctx, coords, scaleFactor);
				// if pointer location is the same as block's,
				// draw pointer right over the block
				if (coords.x == this.pointer.x && coords.y == this.pointer.y && coords.z == this.pointer.z) {
					pointer.render(ctx, this.pointer, scaleFactor);
					pointed = true;
				}
			}
			if (!pointed) {
				// pointer is on an empty space in front
				pointer.render(ctx, this.pointer, scaleFactor);
			}
			ctx.translate(this.pointer.getScrX(scaleFactor), this.pointer.getScrY(scaleFactor));
			ctx.translate(scaledTexture/2, scaledTexture/2);
			ctx.translate(-canvas.width/2, -canvas.height/2);
			ctx.fillStyle = "#777";
			let fontSize = Math.floor(canvas.height * this.textScale);
			ctx.font = fontSize + "px monospace";
			ctx.textAlign = "end";
			ctx.fillText("@ " + this.pointer.x + "," + this.pointer.y + "," + this.pointer.z, canvas.width - 3, fontSize);
			ctx.textAlign = "start";
		};

		this.zmove = function(direction) {
			this.pointer.zmove(direction);
		}

		this.move = function(direction) {
			this.pointer.move(direction);
		};

		this.resort = function() {
			// This function sorts blocks in an order for rendering
			this.blocks_ordered = [];
			for (var x in this.blocks) {
				for (var y in this.blocks[x]) {
					for (var z in this.blocks[x][y]) {
						this.blocks_ordered.push([new Coords(x, y, z), this.blocks[x][y][z]]);
					}
				}
			}
			this.blocks_ordered.sort(function(a, b) {
				return Math.sign(Math.sign(a[0].z - b[0].z)*4
				       + Math.sign(b[0].y - a[0].y)*2
				       + Math.sign(a[0].x - b[0].x));
			});
		};

		this.place = function(block, c) {
			if (c === undefined) {
				c = this.pointer;
			}
			if (this.blocks[c.x] === undefined) {
				this.blocks[c.x] = {};
			}
			if (this.blocks[c.x][c.y] === undefined) {
				this.blocks[c.x][c.y] = {};
			}
			if (this.blocks[c.x][c.y][c.z] === undefined) {
				this.blocks[c.x][c.y][c.z] = block;
			}
			this.resort();
		};

		this.remove = function(c) {
			this.blocks_ordered = [];
			if (c === undefined) {
				c = this.pointer;
			}
			if (this.blocks[c.x] !== undefined
					&& this.blocks[c.x][c.y] !== undefined
					&& this.blocks[c.x][c.y][c.z] !== undefined) {
					delete this.blocks[c.x][c.y][c.z];
			}
			this.resort();
		};

		this.turn = function(c) {
			if (c === undefined) {
				c = this.pointer;
			}
			if (this.blocks[c.x] !== undefined
					&& this.blocks[c.x][c.y] !== undefined
					&& this.blocks[c.x][c.y][c.z] !== undefined) {
					this.blocks[c.x][c.y][c.z].rotate();
			}
		};

		this.place(new Block(BlockType.grass, 0, Orientation.north));
	};

	var sc  = new Scale([BLOCK_SCALE1, BLOCK_SCALE2, BLOCK_SCALE3]);
	var env = new World(BLOCK_SCALE1, FONT_SCALE);
	var inv = new Inventory(FONT_SCALE);

	function redrawAll() {
			let cnv = document.getElementById("cnvs");
			cnv.width = window.innerWidth;
			cnv.height = window.innerHeight;
			env.render(cnv);
			inv.render(cnv);
	}

	window.onload = function() {
		window.setInterval(function() {
			redrawAll();
			env.tick();
		}, 250);
	}

	document.onkeypress = function(e) {
	/* Controls:
	 * 1 (UpL) 2 (VUp) 3 (UpR)
	 * 4 (Rt-) 5 (Act) 6 (Rt+)
	 * 7 (DnL) 8 (VDn) 9 (DnR)
	 *         0 (Tog)
	 */
		switch (e.which) {
			case 48: // "0", toggle instrument
				inv.toggle();
				break;
			case 49: // "1"
				env.move(Orientation.west);
				break;
			case 50: // "2"
				env.zmove(Orientation.north);
				break;
			case 51: // "3"
				env.move(Orientation.north);
				break;
			case 52: // "4"
				break;
			case 53: // "5"
				let tool = inv.getSelectedTool();
				console.log(tool);
				if (tool == "hammer") {
					env.remove();
				} else if (tool == "wrench") {
					env.turn();
				} else if (tool == "zoom") {
					env.setBlockScale(sc.getNextScale());
				} else {
					env.place(new Block(BlockType[tool], 0, Orientation.north));
				}
				e.preventDefault();
				break;
			case 54: // "6"
				break;
			case 55: // "7"
				env.move(Orientation.south);
				break;
			case 56: // "8"
				env.zmove(Orientation.south);
				break;
			case 57: // "9"
				env.move(Orientation.east);
				break;
		  default:
				return;
		}
		redrawAll();
	}
