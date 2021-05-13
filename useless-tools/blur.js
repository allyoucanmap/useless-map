/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Blur() {

        const glitchCanvas = document.createElement('canvas');

        let active = false;

        function setup(event) {
            const button = document.createElement('button');
            button.innerHTML = '👓';
            event.toolbar.appendChild(button);
            button.setAttribute('class', 'icon');
            button.addEventListener('click', () => {
                active = !active;
                button.setAttribute('class', active ? 'icon active' : 'icon');
            });
        }

        let time = 0;

        function draw(event) {
            if (active) {
                const { canvas } = event;
                const ctx = canvas.getContext('2d');
                const aspect = canvas.width / canvas.height;
                const size = (Math.cos(time) + 2) * 64;
                glitchCanvas.width = size * aspect;
                glitchCanvas.height = size / aspect;
                const glitchCtx = glitchCanvas.getContext('2d');
                glitchCtx.drawImage(canvas, 0, 0, glitchCanvas.width, glitchCanvas.height);
                ctx.drawImage(glitchCanvas, 0, 0, canvas.width, canvas.height);
                time += 0.1;
            }
        }
        this.name = 'blur';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.blur = (config) => new Blur(config);
})();
