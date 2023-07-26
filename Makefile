NODE=$$(command -v node)
NPM_PATH=$$(command -v npm)
SH=$$(command -v sh)
NPM=$(NODE) $(NPM_PATH)
PWD=$$(pwd)
DESTINATION=$(HOME)/.nutbot-anchor
DESTINATION_APP=$(DESTINATION)/app
DESTINATION_LOGS=$(DESTINATION)/logs
DOWNLOAD_FILE=$(DESTINATION)/nutbot.tar.gz
ANCHOR_BINARY=$(DESTINATION_APP)/anchor
ANCHOR_CLI_BINARY=$(DESTINATION_APP)/anchor.cli
ANCHOR_DEMON_BINARY=$(DESTINATION_APP)/anchor.demon
ANCHOR_DEMON_BINARY_LOG=$(DESTINATION_LOGS)/demon.log
ANCHOR_DEMON_BINARY_ERROR_LOG=$(DESTINATION_LOGS)/demon.error_log

all: prepare make_bin

prepare:
	mkdir -p $(DESTINATION)
	mkdir -p $(DESTINATION_APP)
	mkdir -p $(DESTINATION_LOGS)
	mv $$($(NPM) pack) $(DOWNLOAD_FILE)
	$(NPM) run clean

make_bin:
	$(NPM) install --prefix $(DESTINATION_APP) $(DOWNLOAD_FILE)

	echo "#!$(SH)" > $(ANCHOR_BINARY)
	echo "$(NODE) $(DESTINATION_APP)/node_modules/nutbot-sdk/src/anchor.js" >> $(ANCHOR_BINARY)

	echo "#!$(SH)" > $(ANCHOR_CLI_BINARY)
	echo "$(NODE) $(DESTINATION_APP)/node_modules/nutbot-sdk/src/anchor-cli.js \$$@" >> $(ANCHOR_CLI_BINARY)

	echo "#!$(SH)" > $(ANCHOR_DEMON_BINARY)
	echo "ANCHOR_DEMON_LOGS=$(ANCHOR_DEMON_BINARY_LOG)" >> $(ANCHOR_DEMON_BINARY)
	echo "ANCHOR_DEMON_ERROR_LOGS=$(ANCHOR_DEMON_BINARY_ERROR_LOG)" >> $(ANCHOR_DEMON_BINARY)
	echo "echo \"### Demon start at \$$(date)\" >> $(ANCHOR_DEMON_BINARY_LOG)" >> $(ANCHOR_DEMON_BINARY)
	echo "echo \"### Demon start at \$$(date)\" >> $(ANCHOR_DEMON_BINARY_ERROR_LOG)" >> $(ANCHOR_DEMON_BINARY)
	echo "$(NODE) $(DESTINATION_APP)/node_modules/nutbot-sdk/src/anchor.demon.js 1>> $(ANCHOR_DEMON_BINARY_LOG) 2>> $(ANCHOR_DEMON_BINARY_ERROR_LOG)" >> $(ANCHOR_DEMON_BINARY)

	chmod a+x $(ANCHOR_BINARY)
	chmod a+x $(ANCHOR_DEMON_BINARY)
	chmod a+x $(ANCHOR_CLI_BINARY)

	echo "Bins:" && \
	echo "  $(ANCHOR_BINARY)" && \
	echo "  $(ANCHOR_CLI_BINARY)" && \
	echo "  $(ANCHOR_DEMON_BINARY)"

