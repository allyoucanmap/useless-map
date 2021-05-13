/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Tool(config) {

        function setup(event) {

        }

        function draw(event) {

        }

        this.name = 'tool';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.tool = (config) => new Tool(config);
})();
