export class MapPreview {
  constructor(canvas, roadData) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.roadData = roadData;
    this.bounds = roadData.bbox;
    this.aerial = new Image();
    this.aerial.onload = () => this.draw();
    this.aerial.src = '/data/chamonix-aerial.jpg';
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
    this.car = null;
    this.draw();
  }

  update(position) { this.car = position; this.draw(); }

  draw() {
    const { canvas, context, roadData } = this;
    const width = canvas.clientWidth || 160;
    const height = canvas.clientHeight || 160;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (this.aerial.complete && this.aerial.naturalWidth) {
      context.drawImage(this.aerial, 0, 0, width, height);
      context.fillStyle = 'rgba(8, 18, 14, 0.26)';
      context.fillRect(0, 0, width, height);
    } else {
      context.fillStyle = '#14221c';
      context.fillRect(0, 0, width, height);
    }
    const [west, south, east, north] = this.bounds;
    const pad = 8;
    const mapWidth = width - pad * 2;
    const mapHeight = height - pad * 2;
    const project = point => [pad + (point.lon - west) / (east - west) * mapWidth, pad + (north - point.lat) / (north - south) * mapHeight];

    const style = {
      service: ['rgba(242, 242, 232, .45)', 0.55], pedestrian: ['rgba(242, 242, 232, .48)', 0.5],
      residential: ['#f3f1e8', 1], living_street: ['#f3f1e8', 1], unclassified: ['#f7f4e8', 1.1],
      tertiary: ['#fff8e6', 1.4], secondary: ['#ffe0a1', 1.8], primary: ['#ffd17b', 2.1],
    };
    for (const type of ['service', 'pedestrian', 'residential', 'living_street', 'unclassified', 'tertiary', 'secondary', 'primary']) {
      const [color, lineWidth] = style[type];
      context.beginPath();
      for (const road of roadData.roads) {
        if (road.type !== type || road.points.length < 2) continue;
        const [firstX, firstY] = project(road.points[0]);
        context.moveTo(firstX, firstY);
        for (let i = 1; i < road.points.length; i++) {
          const [x, y] = project(road.points[i]);
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke();
    }

    context.fillStyle = '#e8f2dd';
    context.font = '8px "DM Mono", monospace';
    context.fillText('CHAMONIX', pad + 4, height - pad - 5);
    if (this.car) {
      const x = pad + (this.car.x / this.car.widthMeters + 0.5) * mapWidth;
      const y = pad + (this.car.z / this.car.depthMeters + 0.5) * mapHeight;
      context.beginPath();
      context.arc(x, y, 4.4, 0, Math.PI * 2);
      context.fillStyle = '#d9f36a';
      context.shadowColor = '#d9f36a';
      context.shadowBlur = 10;
      context.fill();
      context.shadowBlur = 0;
    }
  }
}
