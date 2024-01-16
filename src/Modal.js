import React, { useState, useEffect } from 'react';
import axios from "axios";

const Papers = () => {
    const [papers, setPapers] = useState([]);
    const [embeddings, setEmbeddings] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const fetchData = async ({cleanedQuery}) => {
        setLoading(true);
        try {
            console.log(cleanedQuery)
            const response = await axios.get(
                `https://api.semanticscholar.org/graph/v1/paper/search?query=${cleanedQuery}&offset=100&limit=100`
            );
            const data = response.data.data;
            const extractedPapers = data?.map((paper) => ({
                title: paper.title,
                paperId: paper.paperId,
            }));

            setPapers(extractedPapers);
            setLoading(false);
            console.log(papers)
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const apiKey = "4651951117f244f59453d04b3fb6f170";

    async function getEmbeddings(text) {
        console.log("Process started");
        const response = await fetch("https://luia.openai.azure.com/openai/deployments/matrix/embeddings?api-version=2023-07-01-preview", {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: text
            })
        });
        const responseData = await response.json();

        if (Array.isArray(responseData?.data)) {
            return responseData.data.map(item => item.embedding);
        } else {
            console.error('Expected an array for responseData.data, but received:', responseData.data);
            return [];
        }
    }


    function distanceBetween(embeddingA, embeddingB) {
        console.log(embeddingA, embeddingB);
        if (!Array.isArray(embeddingB) || embeddingB.length === 0) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < embeddingA?.length; i++) {
            dotProduct += embeddingA[i] * embeddingB[i];
            normA += Math.pow(embeddingA[i], 2);
            normB += Math.pow(embeddingB[i], 2);
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }


    const getPaperEmbeddings = async () => {
            const embeddingPromises = papers.map(paper => getEmbeddings(paper.title));
            const newEmbeddings = await Promise.all(embeddingPromises);
            setEmbeddings(newEmbeddings);
            console.log(newEmbeddings)
    };

    useEffect(() => {
        const fetchEmbeddingsAndRecommendations = async () => {
            const newEmbeddings = await getPaperEmbeddings();
            setEmbeddings(newEmbeddings); // This updates the embeddings state
            const paperRecommendations = await getPaperRecommendations(query);
            setRecommendations(paperRecommendations); // This updates the recommendations state
        };

        if (papers.length > 0) {
            fetchEmbeddingsAndRecommendations();
        }
    }, [papers, query]); // Add query to the dependency array if it's also a dependency


    useEffect(() => {
        if (papers.length > 0) {
            getPaperEmbeddings();
        }
    }, [papers]);

    const getPaperRecommendations = async (searchText) => {
        const searchTextEmbedding = await getEmbeddings(searchText);
        console.log(searchTextEmbedding)
        // Check if embeddings are defined and have the expected length
        if (Array.isArray(embeddings) && embeddings.length === papers.length) {
            return papers.map((paper, index) => ({
                ...paper,
                similarity: distanceBetween(searchTextEmbedding, embeddings[index]),
            }))
                .sort((a, b) => b.similarity - a.similarity);
        } else {
            // Handle the case where embeddings are not ready
            return [];
        }
    };


    const handleSearch = async () => {
        setLoading(true);
        const stopWords = ["y", "o", "e", "con", "para", "en", "de", "la", "el", "del", "un", "una", "es", "son", "por", "pero", "más", "menos", "si", "no", "así", "entonces", "cuando", "donde", "cómo", "qué", "quién", "cuyo", "sobre", "bajo", "entre"];

        const cleanedQuery = query
            .toLowerCase()
            .split(" ")
            .filter(word => !stopWords.includes(word))
            .join(" ");

        await fetchData({ cleanedQuery });
        const paperRecommendations = await getPaperRecommendations(query);
        setRecommendations(paperRecommendations);
        console.log(paperRecommendations)
        setLoading(false);
    };


    return (
        <div>
<div className='flex justify-center py-20'>
                <input
                    type="text"
                    className='outline-none w-1/2 p-2 border rounded'
                    placeholder="Refine your search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button className='ml-2 px-5 py-2 rounded bg-green-500 hover:bg-green-700' onClick={handleSearch}>Search</button>
                </div>
                <div className='flex justify-center'>
                                {loading && <p>Loading...</p>}
                </div>
                <div className='flex justify-center'>
                <div className=''>
                    {recommendations?.map((paper, index) => (
                        <div key={index} className='my-6 flex justify-center'>
                            <div className='p-4 w-5/6 sm:w-1/2 border rounded border-gray-400'>
                                <div className='py-4 flex justify-between'>
                                    <p className='text-green-500 pr-6 font-semibold'>{paper.title}</p>
                                    <p className='text-gray-700'>Similarity:{paper.similarity}</p>
                                </div>
                                <p>PaperId: {paper.paperId}</p>

                            </div>
</div>
                    ))}
                </div>
</div>
        </div>
    );
};

export default Papers;
