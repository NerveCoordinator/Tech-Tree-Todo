{
  description = "Tech Tree Project with Node.js and Express";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodejs
            yarn
          ];

          NODE_ENV = "development";

          shellHook = ''
            echo "run the following commands to prepare the environment:"
            echo "npm init -y"
            echo "npm install express multer cors uuid"
            echo "Run 'node server.js' to start the server."
          '';
        };

        packages.tech-tree-app = pkgs.stdenv.mkDerivation {
          pname = "tech-tree-app";
          version = "1.0.0";
          src = ./.;

          buildInputs = with pkgs; [
            nodejs
            yarn
          ];

          installPhase = ''
            if [ -f package.json ]; then
              yarn install --frozen-lockfile
            fi

            mkdir -p $out
            cp -r . $out
          '';

          postInstall = ''
            ln -s $out/server.js $out/run-server
          '';

          meta = with pkgs.lib; {
            description = "Tech Tree Project Node.js Server";
            license = licenses.mit;
            maintainers = [ maintainers.yourname ];
          };
        };

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.tech-tree-app}/run-server";
        };
      });
}

