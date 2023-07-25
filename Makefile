NODE=$$(command -v node)
NPM_PATH=$$(command -v npm)
SH=$$(command -v sh)
NPM=$(NODE) $(NPM_PATH)
PWD=$$(pwd)
nutbot_anchor=$(PWD)/nutbot_anchor

all: make_demon_bin

prepare:
	$(NPM) run prepare

make_demon_bin: prepare
	echo "#!$(SH)" > $(nutbot_anchor)
	echo $(NODE) $(PWD)/src/anchor.demon.js ">>" ~/.logs/nutbot_anchor.log "2>>" ~/.logs/nutbot_anchor.err >> $(nutbot_anchor)
	chmod a+x $(nutbot_anchor)

	echo "# Bin maked $(nutbot_anchor)"
