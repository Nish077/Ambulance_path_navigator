const gridSize = { rows: 6, cols: 15 };
        const grid = document.getElementById("grid");
        const startBtn = document.getElementById("startBtn");
        const endBtn = document.getElementById("endBtn");
        const deleteBtn = document.getElementById("deleteBtn");
        const runBtn = document.getElementById("runBtn");
        let start = null;
        let end = null;
        let gridCells = [];
        let mode = "setStart";
        let car = null;
        let hospital = null;

        // Predefined grid layout
        const predefinedGrid = [
            "...###.........",  // . = empty, # = blocked, R = road
            "...#RR.###..#.R",
            "...#RRRRRR###.R",
            ".RRRR##R.R.RR#R",
            ".R###.#R##RR#.R",
            ".RRRR.#RRRRRRRR"
        ];

        // Create grid cells with predefined layout
        for (let i = 0; i < gridSize.rows; i++) {
            const row = [];
            for (let j = 0; j < gridSize.cols; j++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener("click", () => handleCellClick(cell, i, j));
                
                // Apply predefined layout
                const cellType = predefinedGrid[i][j];
                if (cellType === '#') {
                    cell.classList.add("blocked");
                } else if (cellType === 'R') {
                    cell.classList.add("road");
                }
                
                grid.appendChild(cell);
                row.push(cell);
            }
            gridCells.push(row);
        }

        function handleCellClick(cell, row, col) {
            // Don't allow placing start/end points on blocked cells
            if (cell.classList.contains("blocked") && (mode === "setStart" || mode === "setEnd")) {
                alert("Cannot place start/end points on blocked cells!");
                return;
            }

            if (mode === "setStart") {
                if (start) start.classList.remove("start");
                cell.classList.add("start");
                start = cell;
                addCarToCell(cell);
            } else if (mode === "setEnd") {
                if (end) end.classList.remove("end");
                cell.classList.add("end");
                end = cell;
                addHospitalToCell(cell);
            } else if (mode === "delete") {
                if (cell.classList.contains("start")) {
                    start = null;
                    if (car) car.remove();
                } else if (cell.classList.contains("end")) {
                    end = null;
                    if (hospital) hospital.remove();
                }
                cell.classList.add("blocked");
                cell.classList.remove("start", "end", "road");
            }
        }

        function addCarToCell(cell) {
            if (car) {
                car.remove();
            }
            car = document.createElement("img");
            car.src = "car.png";
            car.classList.add("car");
            car.style.top = `${cell.offsetTop}px`;
            car.style.left = `${cell.offsetLeft}px`;
            document.body.appendChild(car);
        }

        function addHospitalToCell(cell) {
            if (hospital) {
                hospital.remove();
            }
            hospital = document.createElement("img");
            hospital.src = "hospital.png";
            hospital.classList.add("hospital");
            hospital.style.position = "absolute";

            const cellRect = cell.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();

            hospital.style.top = `${cellRect.top - gridRect.top}px`;
            hospital.style.left = `${cellRect.left - gridRect.left}px`;

            grid.appendChild(hospital);
        }

        function dijkstra(start, end) {
            const dist = Array(gridSize.rows)
                .fill()
                .map(() => Array(gridSize.cols).fill(Infinity));
            const prev = Array(gridSize.rows)
                .fill()
                .map(() => Array(gridSize.cols).fill(null));
            const pq = [];
            const directions = [
                [0, 1],   // Right
                [1, 0],   // Down
                [0, -1],  // Left
                [-1, 0],  // Up
                [-1, -1], // Diagonal
                [1, 1],   // Diagonal
                [-1, 1],  // Diagonal
                [1, -1]   // Diagonal
            ];

            let startX = parseInt(start.dataset.row);
            let startY = parseInt(start.dataset.col);

            dist[startX][startY] = 0;
            pq.push([0, startX, startY]);

            while (pq.length) {
                pq.sort((a, b) => a[0] - b[0]);  // Sort by distance
                const [d, x, y] = pq.shift();
                
                if (d > dist[x][y]) continue;

                for (let [dx, dy] of directions) {
                    const newX = x + dx;
                    const newY = y + dy;

                    if (
                        newX >= 0 &&
                        newX < gridSize.rows &&
                        newY >= 0 &&
                        newY < gridSize.cols
                    ) {
                        if (gridCells[newX][newY].classList.contains("blocked")) {
                            continue;
                        }

                        // Calculate movement cost (diagonal movements cost more)
                        let movementCost = Math.abs(dx) + Math.abs(dy) === 2 ? 1.4 : 1;
                        const edgeWeight = gridCells[newX][newY].classList.contains("road")
                            ? movementCost
                            : movementCost * 2;  // Non-road cells cost twice as much

                        if (dist[x][y] + edgeWeight < dist[newX][newY]) {
                            dist[newX][newY] = dist[x][y] + edgeWeight;
                            prev[newX][newY] = [x, y];
                            pq.push([dist[newX][newY], newX, newY]);
                        }
                    }
                }
            }

            let path = [];
            let current = [parseInt(end.dataset.row), parseInt(end.dataset.col)];
            while (current) {
                path.push(current);
                current = prev[current[0]][current[1]];
            }
            path.reverse();

            if (path[0][0] !== startX || path[0][1] !== startY) {
                return [];
            }
            return path;
        }

        function createPathDot(x, y) {
            const dot = document.createElement('div');
            dot.className = 'path-dot';
            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
            document.body.appendChild(dot);
            return dot;
        }

        function updatePathLine(points) {
            const pathElement = document.getElementById('tracePath');
            const pathData = points.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
            ).join(' ');
            pathElement.setAttribute('d', pathData);
        }

        let pathPoints = [];
        let pathDots = [];

        function clearPreviousPath() {
            // Clear existing path line
            pathPoints = [];
            updatePathLine(pathPoints);
            
            // Remove existing dots
            pathDots.forEach(dot => dot.remove());
            pathDots = [];
        }

        function animateCarOnPath(path) {
            clearPreviousPath();
            
            let step = 0;
            const interval = setInterval(() => {
                if (step < path.length) {
                    const [x, y] = path[step];
                    const carPosition = gridCells[x][y].getBoundingClientRect();
                    
                    // Update car position
                    const carX = carPosition.left + window.scrollX + (carPosition.width / 2);
                    const carY = carPosition.top + window.scrollY + (carPosition.height / 2);
                    
                    car.style.top = `${carPosition.top + window.scrollY}px`;
                    car.style.left = `${carPosition.left + window.scrollX}px`;

                    // Create dot at current position
                    const dot = createPathDot(carX, carY);
                    pathDots.push(dot);

                    // Update path line
                    pathPoints.push({ x: carX, y: carY });
                    updatePathLine(pathPoints);

                    step++;
                } else {
                    clearInterval(interval);
                }
            }, 500);
        }

        // Add window resize handler to update path positions
        window.addEventListener('resize', () => {
            if (pathPoints.length > 0) {
                clearPreviousPath();
            }
        });

        // Add cleanup function when changing start/end points
        function cleanupPath() {
            clearPreviousPath();
        }

        // Modify handleCellClick to clean up path when setting new points
        const originalHandleCellClick = handleCellClick;
        handleCellClick = function(cell, row, col) {
            cleanupPath();
            originalHandleCellClick(cell, row, col);
        };

        // Initialize SVG viewBox when the grid is loaded
        function initializeSVGViewBox() {
            const gridRect = grid.getBoundingClientRect();
            const pathLayer = document.getElementById('pathLayer');
            pathLayer.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
            pathLayer.style.width = `${window.innerWidth}px`;
            pathLayer.style.height = `${window.innerHeight}px`;
        }

        // Call this after grid is created
        window.addEventListener('load', initializeSVGViewBox);
        window.addEventListener('resize', initializeSVGViewBox);


        // Event listeners
        startBtn.addEventListener("click", () => {
            mode = "setStart";
        });

        endBtn.addEventListener("click", () => {
            mode = "setEnd";
        });

        deleteBtn.addEventListener("click", () => {
            mode = "delete";
        });

        runBtn.addEventListener("click", () => {
            if (!start || !end) {
                alert("Please select both start and end points.");
                return;
            }

            const path = dijkstra(start, end);

            if (path.length === 0) {
                alert("All roads are blocked, no possible path to the hospital.");
            } else {
                animateCarOnPath(path);
            }
        });