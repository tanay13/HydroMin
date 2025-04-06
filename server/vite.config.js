const { createServer } = require("http");
const { Server } = require("http");

module.exports = {
	server: {
		middlewareMode: true,
		hmr: {
			server: createServer(),
		},
		allowedHosts: ["localhost", "127.0.0.1"],
	},
};
