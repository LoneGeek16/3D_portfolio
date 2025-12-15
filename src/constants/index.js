import { meta, shopify, starbucks, tesla, infosys, ibs, blend360 } from "../assets/images";
import {
    car,
    contact,
    css,
    estate,
    express,
    git,
    github,
    html,
    javascript,
    linkedin,
    mongodb,
    motion,
    mui,
    nextjs,
    nodejs,
    pricewise,
    react,
    redux,
    sass,
    snapgram,
    summiz,
    tailwindcss,
    threads,
    typescript,
    python,
    aws,
    docker,
    kubernetes,
    tensorflow,
    pytorch,
    sql,
    pyspark,
    sklearn,
    langchain,
    autogen,
    mlflow,
    airflow,
    spark
} from "../assets/icons";

export const skills = [
    {
        imageUrl: python,
        name: "Python",
        type: "Programming",
    },
    {
        imageUrl: pyspark,
        name: "PySpark",
        type: "Data Engineering",
    },
    {
        imageUrl: sql,
        name: "SQL",
        type: "Database",
    },
    {
        imageUrl: tensorflow,
        name: "TensorFlow",
        type: "ML Framework",
    },
    {
        imageUrl: pytorch,
        name: "PyTorch",
        type: "ML Framework",
    },
    {
        imageUrl: sklearn,
        name: "Scikit-learn",
        type: "ML Framework",
    },
    {
        imageUrl: langchain,
        name: "LangChain",
        type: "GenAI",
    },
    {
        imageUrl: autogen,
        name: "AutoGen",
        type: "GenAI",
    },
    {
        imageUrl: aws,
        name: "AWS",
        type: "Cloud",
    },
    {
        imageUrl: docker,
        name: "Docker",
        type: "DevOps",
    },
    {
        imageUrl: kubernetes,
        name: "Kubernetes",
        type: "DevOps",
    },
    {
        imageUrl: git,
        name: "Git",
        type: "Version Control",
    },
    {
        imageUrl: github,
        name: "GitHub",
        type: "Version Control",
    },
    {
        imageUrl: mlflow,
        name: "MLflow",
        type: "MLOps",
    },
    {
        imageUrl: airflow,
        name: "Airflow",
        type: "Data Engineering",
    },
    {
        imageUrl: spark,
        name: "Spark",
        type: "Big Data",
    }
];

export const experiences = [
    {
        title: "Technology Analyst",
        company_name: "Infosys",
        icon: infosys,
        iconBg: "#E3F2FD",
        date: "Jul 2018 - Aug 2022",
        points: [
            "Developed credit risk PD models for mortgage loans using logistic regression for Bank of America.",
            "Designed OCR engine using CNN-LSTM for transactional images reducing 80 man-hours/day.",
            "Created predictive maintenance models using LSTM for heavy machinery reducing downtime.",
            "Implemented ticket routing automation using Random Forest, saving 40 man-hours/day.",
            "Engineered scalable data processing pipelines using Spark and Hadoop ecosystems.",
        ],
    },
    {
        title: "Lead Machine Learning Engineer",
        company_name: "IBS Software - Expedia",
        icon: ibs,
        iconBg: "#FFEBEE",
        date: "Sept 2022 - Dec 2024",
        points: [
            "Developed and deployed ML pipelines for search relevance and room-type mapping using GBDT models on AWS.",
            "Implemented Generative AI personalized content recommendations using Claude and Titan via Amazon Bedrock.",
            "Built NLP models (BERT, VADER) for customer sentiment analysis feeding into CX dashboards.",
            "Automated workflows and retraining pipelines using Airflow; deployed inference services on Kubernetes.",
        ],
    },
    {
        title: "Generative AI Engineer - Research",
        company_name: "Blend360 - Franklin Templeton",
        icon: blend360,
        iconBg: "#E8F5E9",
        date: "Dec 2024 - Present",
        points: [
            "Architected multi-agent framework for vSIM to auto-orchestrate strategy generation and portfolio management.",
            "Implemented agent tool interfaces with memory store for iterative refinement.",
            "Designed evaluation harness comparing time-series LLM variants on multi-horizon signals.",
            "Automated experiment tracking with MLflow + Ray; containerized on AWS SageMaker.",
        ],
    },
];

export const socialLinks = [
    {
        name: 'Contact',
        iconUrl: contact,
        link: '/contact',
    },
    {
        name: 'GitHub',
        iconUrl: github,
        link: 'https://github.com/jagadishreddy',
    },
    {
        name: 'LinkedIn',
        iconUrl: linkedin,
        link: 'https://www.linkedin.com/in/jagadishreddy',
    }
];

export const projects = [
    {
        iconUrl: summiz,
        theme: 'btn-back-yellow',
        name: 'Investment Research Notes Generator',
        description: 'Built IRN app to summarize earning calls transcripts using LLM as a Judge for evaluation. Automated financial document analysis for investment research.',
        link: 'https://github.com/jagadishreddy',
    },
    {
        iconUrl: estate,
        theme: 'btn-back-green',
        name: 'Multi-Agent vSIM Framework',
        description: 'Architected multi-agent framework for Virtual Systematic Investment Management to auto-orchestrate strategy generation, simulation, and portfolio rebalancing.',
        link: 'https://github.com/jagadishreddy',
    },
    {
        iconUrl: pricewise,
        theme: 'btn-back-red',
        name: 'GenAI Content Rewriter',
        description: 'Customized lodging descriptions for Expedia using Claude and Titan via Amazon Bedrock. Personalized content recommendations based on user search history.',
        link: 'https://github.com/jagadishreddy',
    },
    {
        iconUrl: car,
        theme: 'btn-back-blue',
        name: 'ML-Powered Search Relevance',
        description: 'Developed and deployed ML pipelines for search relevance and room-type mapping using GBDT models on AWS for Expedia.',
        link: 'https://github.com/jagadishreddy',
    },
    {
        iconUrl: threads,
        theme: 'btn-back-pink',
        name: 'Customer Sentiment Analysis',
        description: 'Built NLP models using BERT and VADER for customer sentiment analysis feeding into CX dashboards. Automated insight generation for business decisions.',
        link: 'https://github.com/jagadishreddy',
    },
    {
        iconUrl: snapgram,
        theme: 'btn-back-black',
        name: 'OCR Engine for Transactions',
        description: 'Designed OCR engine using CNN-LSTM for transactional images, reducing manual processing by 80 man-hours per day.',
        link: 'https://github.com/jagadishreddy',
    }
];