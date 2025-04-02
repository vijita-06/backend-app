const express = require("express");
const math = require("mathjs");
const cors = require("cors");

const app = express();
app.use(cors());

const distributions = {
  normal: {
    pdf: (x, mu = 0, sigma = 1) =>
      (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * ((x - mu) / sigma) ** 2),
    cdfExpression: "0.5 * (1 + erf((x - μ) / (σ * sqrt(2))))",
    pdfExpression: "(1 / (σ√(2π))) * exp(-0.5 * ((x - μ) / σ)^2)",
    mean: (mu = 0) => mu,
    variance: (sigma = 1) => sigma ** 2,
  },
  uniform: {
    pdf: (x, a = 0, b = 1) => (x >= a && x <= b ? 1 / (b - a) : 0),
    cdfExpression: "((x - a) / (b - a)) for a ≤ x ≤ b",
    pdfExpression: "1 / (b - a) for a ≤ x ≤ b",
    mean: (a = 0, b = 1) => (a + b) / 2,
    variance: (a = 0, b = 1) => (b - a) ** 2 / 12,
  },
  exponential: {
    pdf: (x, lambda = 1) => (x >= 0 ? lambda * Math.exp(-lambda * x) : 0),
    cdfExpression: "1 - exp(-λx) for x ≥ 0",
    pdfExpression: "λ * exp(-λx) for x ≥ 0",
    mean: (lambda = 1) => 1 / lambda,
    variance: (lambda = 1) => 1 / lambda ** 2,
  },
  poisson: {
    pdf: (x, lambda = 3) =>
      Number.isInteger(x) && x >= 0
        ? (Math.exp(-lambda) * Math.pow(lambda, x)) / math.factorial(x)
        : 0,
    cdfExpression: "Σ (e^(-λ) * λ^k / k!) from k=0 to x",
    pdfExpression: "(e^(-λ) * λ^x) / x!",
    mean: (lambda = 3) => lambda,
    variance: (lambda = 3) => lambda,
  },
  rayleigh: {
    pdf: (x, sigma = 1) => (x >= 0 ? (x / sigma ** 2) * Math.exp(-(x ** 2) / (2 * sigma ** 2)) : 0),
    cdfExpression: "1 - exp(-x^2 / (2 * σ^2)) for x ≥ 0",
    pdfExpression: "(x / σ^2) * exp(-x^2 / (2 * σ^2)) for x ≥ 0",
    mean: (sigma = 1) => sigma * Math.sqrt(Math.PI / 2),
    variance: (sigma = 1) => (2 - Math.PI / 2) * sigma ** 2,
  },
  laplacian: {
    pdf: (x, mu = 0, b = 1) =>
      (1 / (2 * b)) * Math.exp(-Math.abs(x - mu) / b),
    cdfExpression: "0.5 * (1 + sign(x - μ) * (1 - exp(-|x - μ| / b)))",
    pdfExpression: "(1 / (2 * b)) * exp(-|x - μ| / b)",
    mean: (mu = 0) => mu,
    variance: (b = 1) => 2 * b ** 2,
  },
  binomial: {
    pdf: (x, n = 10, p = 0.5) =>
      math.combinations(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x),
    cdfExpression: "Σ (nCx * p^x * (1-p)^(n-x)) from x=0 to x",
    pdfExpression: "nCx * p^x * (1-p)^(n-x)",
    mean: (n = 10, p = 0.5) => n * p,
    variance: (n = 10, p = 0.5) => n * p * (1 - p),
  },
};

const computeCDF = (pdfValues) => {
  let cdfValues = [];
  let cumulativeSum = 0;
  for (let i = 0; i < pdfValues.length; i++) {
    cumulativeSum += pdfValues[i];
    cdfValues.push(cumulativeSum);
  }
  const total = cdfValues[cdfValues.length - 1];
  return cdfValues.map((val) => val / total);
};

const computeStatistics = (distributionType, params) => {
  const dist = distributions[distributionType];
  const mean = dist.mean(...params);
  const variance = dist.variance(...params);
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    variance,
    stdDev,
  };
};
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.get("/distribution/:type", (req, res) => {
  const type = req.params.type;
  if (!distributions[type]) {
    return res.status(400).json({ error: "Invalid distribution type" });
  }

  // Get query parameters for distribution, or set default values
  const params = Object.keys(req.query).map((key) => parseFloat(req.query[key]));

  let xValues =
    type === "poisson" || type === "binomial"
      ? math.range(0, 20, 1).toArray()
      : math.range(-5, 5, 0.1).toArray();

  let pdfValues = xValues.map((x) => distributions[type].pdf(x, ...params));
  let cdfValues = computeCDF(pdfValues);
  let stats = computeStatistics(type, params);

  res.json({
    xValues,
    pdfValues,
    cdfValues,
    stats,
    pdfExpression: distributions[type].pdfExpression,
    cdfExpression: distributions[type].cdfExpression,
  });
});

app.get("/", (req, res) => {
  res.send("Backend is running!");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

