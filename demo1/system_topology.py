"""
System Topology Diagram — The pAInters
Generates demo1/system_topology.png

Requirements:
    pip3 install diagrams
    brew install graphviz   # macOS
    python3 demo1/system_topology.py
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import Users
from diagrams.programming.framework import NextJs, Vercel
from diagrams.onprem.network import Traefik
from diagrams.saas.identity import Auth0
from diagrams.gcp.storage import GCS
from diagrams.onprem.database import PostgreSQL
from diagrams.gcp.ml import VertexAI

# ── Graph-level styling ────────────────────────────────────────────────────
graph_attr = {
    "fontname": "Helvetica Neue, Helvetica, Arial, sans-serif",
    "fontsize": "13",
    "bgcolor": "white",
    "pad": "0.8",
    "splines": "ortho",
    "nodesep": "1.0",
    "ranksep": "1.6",
    "margin": "0.5",
}

node_attr = {
    "fontname": "Helvetica Neue, Helvetica, Arial, sans-serif",
    "fontsize": "11",
}

edge_attr = {
    "fontname": "Helvetica Neue, Helvetica, Arial, sans-serif",
    "fontsize": "9",
    "color": "#6b7280",
    "fontcolor": "#374151",
}

# ── Diagram ────────────────────────────────────────────────────────────────
with Diagram(
    "The pAInters — System Topology",
    filename="demo1/system_topology",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
    show=False,
    direction="LR",
):

    # ── UI Tier ───────────────────────────────────────────────────────────
    with Cluster("UI Tier"):
        browser = Users("User\nBrowser")
        pages   = NextJs("Next.js Pages\nLogin · Upload\nDashboard · History")

    # ── Logic Tier ────────────────────────────────────────────────────────
    with Cluster("Logic Tier  ·  Vercel Serverless"):
        api   = Traefik("API Routes\n/api/upload\n/api/uploads\n/api/auth")
        auth  = Auth0("NextAuth.js\nJWT · bcrypt")

    # ── Data Tier ─────────────────────────────────────────────────────────
    with Cluster("Data Tier"):
        db   = PostgreSQL("Neon PostgreSQL\nUsers · Uploads\nAnalyses")
        blob = GCS("Vercel Blob\nJSON Files")

    # ── External AI Service ───────────────────────────────────────────────
    with Cluster("External AI Service"):
        gemini = VertexAI("Google Gemini\nHallucination\nAnalysis")

    # ── Primary interaction flow ──────────────────────────────────────────
    browser >> Edge(label="① HTTP (JWT cookie)") >> pages
    pages   >> Edge(label="② POST upload") >> api
    api     >> Edge(label="③ verify session") >> auth
    api     >> Edge(label="④ store file") >> blob
    api     >> Edge(label="⑤ analyze  (≤ 60 s)", style="bold", color="#4f46e5") >> gemini
    api     >> Edge(label="⑥ write results") >> db
    pages   >> Edge(label="⑦ poll / fetch", style="dashed") >> db
