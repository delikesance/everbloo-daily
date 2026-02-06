{ pkgs, lib, config, inputs, ... }:

{
	languages.javascript = {
		enable = true;
		bun.enable = true;
	};

	dotenv.enable = true;

	packages = with pkgs; [
		gemini-cli.out
		bun.out
	];
}
