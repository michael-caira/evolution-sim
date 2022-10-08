import * as sim from "lib-simulation-wasm";
import { Terminal } from "./app/terminal";
import { Viewport } from "./app/viewport";

/* ---------- */

const terminal = new Terminal(
    document.getElementById("terminal-stdin"),
    document.getElementById("terminal-stdout"),
);

const viewport = new Viewport(
    document.getElementById("viewport"),
);

/**
 * Current simulation.
 *
 * @type {Simulation}
 */
let simulation = new sim.Simulation(sim.Simulation.default_config());

/**
 * Whether the simulation is working or not.
 * Can be modified by the `pause` command.
 *
 * @type {boolean}
 */
let active = true;

/* ---------- */

const config = simulation.config();

terminal.println("Evolution Simulation.");
terminal.println("");
terminal.println("---- About ----");
terminal.println("");
terminal.println("Each triangle represents a bird; each bird has an *eye*, whose eyesight is drawn around the bird, and a *brain* that decides where and how fast the bird should be moving.");
terminal.println("");
terminal.println("Each circle represents a food (pizza, so to say), which birds are meant to find and eat.");
terminal.println("");
terminal.println("All birds start flying with randomized brains, and after 2500 turns (around 40 real-time seconds), birds who managed to eat the most foods are reproduced, and their offspring starts the simulation anew.");
terminal.println("");
terminal.println("Thanks to evolution, every generation gets slightly better at locating the food - almost as if the birds programmed themselves!");
terminal.println("");
terminal.println("(fwiw, this neither a swarm intelligence - as birds don't see each other - nor a boids - as birds are not hard-coded to find the food - simulation; just regular neural network & genetic algorithm magic.)");
terminal.println("");
terminal.println("You can affect the simulation by entering commands in the input at the bottom of this box - for starters, try executing the `train` command a few times (write `t`, press enter, write `t`, press enter etc.) - this fast-forwards the simulation, allowing you to see the birds getting smarter by the second.");
terminal.println("");
terminal.println("---- Funky scenarios ----");
terminal.println("");
terminal.println("  * r i:ga_reverse=1 f:sim_speed_min=0.003");
terminal.println("    (birdies *avoid* food)");
terminal.println("");
terminal.println("  * r i:brain_neurons=1");
terminal.println("    (single-neuroned zombies)");
terminal.println("");
terminal.println("  * r f:food_size=0.05");
terminal.println("    (biiiigie birdies)");
terminal.println("");
terminal.println("  * r f:eye_fov_angle=0.45");
terminal.println("    (narrow field of view)");
terminal.println("");
terminal.println("----");
terminal.scrollToTop();

/* ---------- */

terminal.onInput((input) => {
    terminal.println("");
    terminal.println("$ " + input);

    try {
        exec(input);
    } catch (err) {
        terminal.println(`  ^ err: ${err}`);
    }
});

function exec(input) {
    if (input.includes("[") || input.includes("]")) {
        throw "square brackets are just for documentation purposes - you don't have to write them, e.g.: reset animals=100";
    }

    const [cmd, ...args] = input.split(" ");

    if (cmd === "p" || cmd === "pause") {
        execPause(args);
        return;
    }

    if (cmd === "r" || cmd === "reset") {
        execReset(args);
        return;
    }

    if (cmd === "t" || cmd === "train") {
        execTrain(args);
        return;
    }

    throw "unknown command";
}

function execPause(args) {
    if (args.length > 0) {
        throw "this command accepts no parameters";
    }

    active = !active;
}

function execReset(args) {
    let config = sim.Simulation.default_config();

    for (const arg of args) {
        const [argName, argValue] = arg.split("=");

        if (argName.startsWith("i:")) {
            config[argName.slice(2)] = parseInt(argValue);
        } else if (argName.startsWith("f:")) {
            config[argName.slice(2)] = parseFloat(argValue);
        } else {
            switch (argName) {
                case "a":
                case "animals":
                    config.world_animals = parseInt(argValue);
                    break;

                case "f":
                case "foods":
                    config.world_foods = parseInt(argValue);
                    break;

                case "n":
                case "neurons":
                    config.brain_neurons = parseInt(argValue);
                    break;

                case "p":
                case "photoreceptors":
                    config.eye_cells = parseInt(argValue);
                    break;

                default:
                    throw `unknown parameter: ${argName}`;
            }
        }
    }

    simulation = new sim.Simulation(config);
}

function execTrain(args) {
    if (args.length > 1) {
        throw "this command accepts at most one parameter";
    }

    const generations = args.length == 0 ? 1 : parseInt(args[0]);

    for (let i = 0; i < generations; i += 1) {
        if (i > 0) {
            terminal.println("");
        }

        const stats = simulation.train();
        terminal.println(stats);
    }
}

/* ---------- */

function redraw() {
    if (active) {
        const stats = simulation.step();

        if (stats) {
            terminal.println(stats);
        }
    }

    const config = simulation.config();
    const world = simulation.world();

    viewport.clear();

    for (const food of world.foods) {
        viewport.drawCircle(
            food.x,
            food.y,
            (config.food_size / 2.0),
            'rgb(0, 255, 128)',
        );
    }

    for (const animal of world.animals) {
        viewport.drawTriangle(
            animal.x,
            animal.y,
            config.food_size,
            animal.rotation,
            'rgb(255, 255, 255)',
        );

        const anglePerCell = config.eye_fov_angle / config.eye_cells;

        for (let cellId = 0; cellId < config.eye_cells; cellId += 1) {
            const angleFrom = (animal.rotation - config.eye_fov_angle / 2.0) + (cellId * anglePerCell);
            const angleTo = angleFrom + anglePerCell;
            const energy = animal.vision[cellId];

            viewport.drawArc(
                animal.x,
                animal.y,
                (config.food_size * 2.5),
                angleFrom,
                angleTo,
                `rgba(0, 255, 128, ${energy})`,
            );
        }
    }

    requestAnimationFrame(redraw);
}

redraw();