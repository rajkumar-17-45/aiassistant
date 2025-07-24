const GEMINI_API_KEY = "Your_api_key";

document.addEventListener("DOMContentLoaded", function () {





    // Get DOM elements

    const resumeUpload = document.getElementById("resumeUpload");
    const resumeLabel = document.getElementById("resumeLabel");
    const resumeStatus = document.getElementById("resumeStatus");
    const resumeFileName = document.getElementById("resumeFileName");
    const processingIndicator = document.getElementById("processingIndicator");

    // Check if elements exist (defensive coding)
    if (!resumeUpload || !resumeLabel || !resumeStatus || !resumeFileName || !processingIndicator) {
        console.error("Required elements not found in the DOM");
        return;
    }

    // Load PDF.js library dynamically
    loadPdfJsLibrary();

    // Add event listener for file upload
    resumeUpload.addEventListener("change", handleResumeUpload);

    // Load previously stored resume if available
    loadStoredResume();

    /**
     * Dynamically load PDF.js library
     */
    function loadPdfJsLibrary() {
        // Check if PDF.js is already loaded
        if (typeof pdfjsLib !== 'undefined') {
            console.log("PDF.js already loaded");
            return;
        }

        // Load PDF.js core library
        const pdfScript = document.createElement('script');
        pdfScript.src = 'build/pdf.mjs'; // Correct path
        pdfScript.type = 'module'; // Use module type for .mjs files
        pdfScript.onload = function () {
            // Set worker source after library is loaded
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'build/pdf.worker.mjs'; // Correct path
                console.log("PDF.js loaded successfully");
            }
        };
        document.head.appendChild(pdfScript);
    }
    /**
     * Handles the resume upload event
     */
    function handleResumeUpload() {
        const file = this.files[0];

        if (!file) {
            return;
        }

        // Check file type
        if (file.type !== 'application/pdf') {
            resumeStatus.textContent = "Please upload a PDF file";
            return;
        }

        // Show processing state
        showProcessingState(file.name);

        // Read the file content
        const reader = new FileReader();

        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            extractTextFromPDF(arrayBuffer)
                .then(resumeText => {
                    if (resumeText) {
                        processResumeText(resumeText, file.name);
                    } else {
                        hideProcessingState();
                        resumeStatus.textContent = "Could not extract text from PDF.";
                    }
                })
                .catch(error => {
                    console.error("PDF extraction error:", error);
                    hideProcessingState();
                    resumeStatus.textContent = "Error extracting text from PDF.";
                });
        };

        reader.onerror = function () {
            hideProcessingState();
            resumeStatus.textContent = "Error reading file. Please try again.";
        };

        reader.readAsArrayBuffer(file);
    }

    /**
     * Extract text content from PDF file
     * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
     * @returns {Promise<string>} - Text extracted from PDF
     */
    async function extractTextFromPDF(arrayBuffer) {
        return new Promise((resolve, reject) => {
            try {
                // Check if PDF.js is loaded
                if (typeof pdfjsLib === 'undefined') {
                    console.error("PDF.js library not loaded");
                    // Try to load it again
                    loadPdfJsLibrary();
                    reject(new Error("PDF.js library not available. Please try again."));
                    return;
                }

                // Load the PDF document
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

                loadingTask.promise
                    .then(async function (pdf) {
                        let extractedText = "";

                        // Process each page
                        for (let i = 1; i <= pdf.numPages; i++) {
                            try {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();

                                // Extract text from each item and join with spaces
                                const pageText = textContent.items
                                    .map(item => item.str)
                                    .join(" ");

                                extractedText += pageText + "\n";
                            } catch (pageError) {
                                console.error(`Error extracting text from page ${i}:`, pageError);
                            }
                        }

                        resolve(extractedText.trim());
                    })
                    .catch(error => {
                        console.error("Error loading PDF:", error);
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in PDF extraction:", error);
                reject(error);
            }
        });
    }

    /**
     * Process the resume text and send to Gemini API
     * @param {string} text - The text content of the resume
     * @param {string} fileName - The name of the uploaded file
     */
    async function processResumeText(text, fileName) {
        try {
            resumeStatus.textContent = "Analyzing resume with AI...";

            // Send to Gemini API for processing
            const resumeJSON = await getResumeDataFromGemini(text);

            if (resumeJSON) {
                try {
                    // Store as proper JSON
                    if (typeof resumeJSON === 'object') {
                        localStorage.setItem("resumeData", JSON.stringify(resumeJSON));
                    } else {
                        // If it's a string, try to parse it first to validate
                        JSON.parse(resumeJSON); // This will throw if invalid
                        localStorage.setItem("resumeData", resumeJSON);
                    }

                    // Store file name
                    localStorage.setItem("resumeName", fileName);

                    // Update UI
                    hideProcessingState();
                    resumeStatus.textContent = "Resume processed successfully!";
                    resumeLabel.innerHTML = '<span class="upload-icon">📤</span><span class="upload-text">Change Resume</span>';
                    resumeFileName.textContent = `📂 ${fileName}`;

                    // Debug - display the extracted data
                    console.log("Processed resume data:", resumeJSON);

                    // Trigger match update if job details exist
                    if (localStorage.getItem("jobDescription")) {
                        // if (typeof updateJobMatchUI === 'function') {
                        //     updateJobMatchUI();
                        // }
                    }
                } catch (e) {
                    console.error("Invalid JSON format:", e);
                    hideProcessingState();
                    resumeStatus.textContent = "Error: Invalid response format from AI.";
                }
            } else {
                hideProcessingState();
                resumeStatus.textContent = "Failed to process resume.";
            }
        } catch (error) {
            console.error("Resume processing error:", error);
            hideProcessingState();
            resumeStatus.textContent = "Error processing resume.";
        }
    }

    /**
     * Call Gemini API to convert resume text to structured JSON
     * @param {string} resumeText - The text content of the resume
     * @returns {object|string} - Structured resume data
     */
    async function getResumeDataFromGemini(resumeText) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: `Extract structured information from this resume:\n${resumeText}\nReturn in JSON format with the following structure: {"name": "", "contact": {"email": "", "phone": ""}, "skills": [], "experience": [{"title": "", "company": "", "duration": "", "description": ""}], "education": [{"degree": "", "institution": "", "year": ""}]}`,
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                console.error("API error:", response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            console.log("API Response:", JSON.stringify(data));

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const responseText = data.candidates[0].content.parts[0].text;

                // Try to extract valid JSON from the response
                try {
                    // First, check if it's already valid JSON
                    const parsedJson = JSON.parse(responseText);
                    return parsedJson;
                } catch (e) {
                    // If not valid JSON, try to extract JSON portion
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        // Validate the extracted JSON
                        try {
                            const parsedJson = JSON.parse(jsonMatch[0]);
                            return parsedJson;
                        } catch (jsonError) {
                            console.error("Extracted text is not valid JSON:", jsonError);
                        }
                    }

                    console.warn("Could not extract valid JSON, returning text as-is");
                    return responseText;
                }
            }

            console.error("Unexpected API response format:", data);
            return null;
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return null;
        }
    }

    /**
     * Load previously stored resume data
     */
    function loadStoredResume() {
        const resumeData = localStorage.getItem("resumeData");
        const resumeName = localStorage.getItem("resumeName");

        if (resumeData && resumeName) {
            resumeStatus.textContent = "Resume loaded from storage.";
            resumeLabel.innerHTML = '<span class="upload-icon">📤</span><span class="upload-text">Change Resume</span>';
            resumeFileName.textContent = `📂 ${resumeName}`;
        }
    }

    /**
     * Show processing state
     * @param {string} fileName - The name of the file being processed
     */
    function showProcessingState(fileName) {
        resumeStatus.textContent = "Reading resume...";
        processingIndicator.classList.add("active");
        resumeFileName.textContent = `📂 ${fileName}`;
    }

    /**
     * Hide processing state
     */
    function hideProcessingState() {
        processingIndicator.classList.remove("active");
    }



















    // Job Details Elements
    const refreshBtn = document.getElementById("refreshJobDetails");
    const expandBtn = document.getElementById("expandJobDesc");
    const retryBtn = document.getElementById("retryJobFetch");
    const jobTitle = document.getElementById("jobTitle");
    const companyName = document.getElementById("companyName");
    const jobDesc = document.getElementById("jobDesc");
    const jobError = document.getElementById("jobError");
    const jobLoading = document.getElementById("jobLoading");

    let isExpanded = false;

    // Event listeners
    refreshBtn.addEventListener("click", refreshJobDetails);
    expandBtn.addEventListener("click", toggleJobDescription);
    retryBtn.addEventListener("click", refreshJobDetails);

    // Load job details when extension opens
    loadJobDetails();

    function refreshJobDetails() {
        showLoadingState();

        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length === 0) {
                    showErrorState("No active tab found. Please open a job posting page.");
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: extractJobDetailsFromAnyPage
                }, function (results) {
                    if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                        showErrorState("Failed to extract job details. Try another page.");
                        return;
                    }

                    processJobData(results[0].result);
                });
            });
        } else {
            // Simulated data for testing
            const mockJobData = {
                title: "Frontend Developer",
                company: "Tech Solutions Inc.",
                description: "Looking for a frontend developer skilled in HTML, CSS, JavaScript, and React."
            };
            processJobData(mockJobData);
        }
    }

    /**
   * Escape HTML special characters to prevent XSS attacks
   * @param {string} str - The string to escape
   * @returns {string} - The escaped string
   */
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Remove HTML tags from a string
     * @param {string} str - The string to remove HTML tags from
     * @returns {string} - The string without HTML tags
     */
    function removeHTMLTags(str) {
        return str.replace(/<[^>]*>/g, ''); // Remove all HTML tags
    }

    /**
     * Sanitize a string by escaping HTML and removing tags
     * @param {string} str - The string to sanitize
     * @returns {string} - The sanitized string
     */
    function sanitizeString(str) {
        const withoutTags = removeHTMLTags(str); // Remove HTML tags
        return escapeHTML(withoutTags); // Escape special characters
    }

    // Update job data with sanitization
    function processJobData(jobData) {
        // Sanitize title and description
        const sanitizedTitle = sanitizeString(jobData.title || "");
        const sanitizedCompany = sanitizeString(jobData.company || "");
        const sanitizedDescription = sanitizeString(jobData.description || "");

        // Update DOM elements with sanitized data
        jobTitle.textContent = sanitizedTitle || "Job Title Not Found";
        companyName.textContent = sanitizedCompany || "Company Not Found";
        jobDesc.textContent = sanitizedDescription || "No job description available.";

        // Store sanitized data in localStorage
        localStorage.setItem("jobTitle", sanitizedTitle);
        localStorage.setItem("jobCompany", sanitizedCompany);
        localStorage.setItem("jobDescription", sanitizedDescription);


        showContentState();
        isExpanded = false;
        jobDesc.classList.remove("expanded");
        expandBtn.textContent = "More";

        const resumeJson = localStorage.getItem("resumeData");
        if (resumeJson) {

            const resumeData = JSON.parse(resumeJson);
            const resumeText = formatResumeText(resumeData);


            const jobDetailsFormatted = `Title: ${jobData.title}\nCompany: ${jobData.company}\nDescription: ${jobData.description}`;


            matchTheJobWithUser(jobDetailsFormatted, resumeText);
        } else {

            showMatchError("Please upload a resume first to see job match results.");
        }

    }

    function formatResumeText(resumeData) {
        try {

            let formattedText = `Name: ${resumeData.name || 'Not provided'}\n`;


            if (resumeData.contactInfo) {
                formattedText += `Contact: ${resumeData.contactInfo.email || ''} `;
                if (resumeData.contactInfo.phone) {
                    formattedText += `| ${resumeData.contactInfo.phone} `;
                }
                formattedText += '\n';
            }


            if (resumeData.skills && resumeData.skills.length) {
                formattedText += `\nSkills: ${resumeData.skills.join(', ')}\n`;
            }


            if (resumeData.workExperience && resumeData.workExperience.length) {
                formattedText += '\nWork Experience:\n';
                resumeData.workExperience.forEach(job => {
                    formattedText += `- ${job.title || 'Role'} at ${job.company || 'Company'}`;
                    if (job.date) formattedText += ` (${job.date})`;
                    formattedText += '\n';
                    if (job.description) formattedText += `  ${job.description}\n`;
                });
            }


            if (resumeData.education && resumeData.education.length) {
                formattedText += '\nEducation:\n';
                resumeData.education.forEach(edu => {
                    formattedText += `- ${edu.degree || 'Degree'} from ${edu.institution || 'Institution'}`;
                    if (edu.date) formattedText += ` (${edu.date})`;
                    formattedText += '\n';
                });
            }

            return formattedText;
        } catch (error) {
            console.error("Error formatting resume:", error);
            return "Error parsing resume data. Please try uploading again.";
        }
    }
    async function matchTheJobWithUser(jobData, resumeText) {
        try {
            const apiKey = "AIzaSyAaVGOL1j6z2t6yxOUVBYXx2Rm-DX4o-Ng";
            console.log("🔍 Matching Job with Resume...");

            // Show loading state in UI
            const matchBadge = document.getElementById("matchBadge");
            matchBadge.textContent = "Analyzing...";
            matchBadge.className = "match-badge";

            document.getElementById("matchedSkills").innerHTML = '<li class="loading-item">Analyzing skills...</li>';
            document.getElementById("missingSkills").innerHTML = '<li class="loading-item">Analyzing skills...</li>';
            document.getElementById("matchedCount").textContent = "...";
            document.getElementById("missingCount").textContent = "...";

            // Prepare API request body
            const requestBody = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `
Analyze the following Job Description and Resume, and calculate an ATS score.

Job Description:
${jobData}

Resume:
${resumeText}

Instructions:
1. Extract key skills from the Job Description.
2. Compare them with the Resume skills.
3. Calculate an ATS score based on skill match percentage.
4. Return only a structured JSON response with:
   - matched_skills (List of matching skills)
   - missing_skills (List of missing skills from Resume)
   - ATS_score (percentage match)

Provide a JSON response.
                        `
                            }
                        ]
                    }
                ]
            };


            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
                timeout: 30000
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            console.log("📊 API Response:", data);

            // Extract structured JSON from API response
            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                try {
                    const responseText = data.candidates[0].content.parts[0].text;
                    // Extract JSON from response (in case there's surrounding text)
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    const jsonText = jsonMatch ? jsonMatch[0] : responseText;

                    const atsResult = JSON.parse(jsonText);

                    // Validate the structure of the result
                    if (!atsResult.hasOwnProperty('matched_skills') ||
                        !atsResult.hasOwnProperty('missing_skills') ||
                        !atsResult.hasOwnProperty('ATS_score')) {
                        throw new Error("Invalid response format: missing required fields");
                    }

                    // Make sure skills are arrays even if API returns strings
                    if (!Array.isArray(atsResult.matched_skills)) {
                        atsResult.matched_skills = atsResult.matched_skills ? [atsResult.matched_skills] : [];
                    }
                    if (!Array.isArray(atsResult.missing_skills)) {
                        atsResult.missing_skills = atsResult.missing_skills ? [atsResult.missing_skills] : [];
                    }

                    // Make sure ATS_score is a number
                    if (typeof atsResult.ATS_score !== 'number') {
                        atsResult.ATS_score = parseInt(atsResult.ATS_score) || 0;
                    }

                    updateJobMatchUI(atsResult); // Update UI with matched results

                    // Store the match results for potential later use
                    localStorage.setItem("lastMatchResult", JSON.stringify(atsResult));

                    // Also update the resume suggestions based on match results
                    // updateResumeSuggestions();

                } catch (jsonError) {
                    console.error("⚠️ Error parsing JSON from API response:", jsonError);
                    console.log("Raw response text:", data.candidates[0].content.parts[0].text);

                    // Show error in UI
                    showMatchError("Could not parse API response. Try again later.");
                }
            } else {
                throw new Error("Invalid API response format");
            }

        } catch (error) {
            console.error("⚠️ Job Matching Error:", error);
            showMatchError(`Error: ${error.message}`);
        }
    }

    function showMatchError(message) {
        // Display error in match UI
        const matchBadge = document.getElementById("matchBadge");
        matchBadge.textContent = "Match Failed";
        matchBadge.className = "match-badge error";

        // Clear skills lists and display error message
        document.getElementById("matchedSkills").innerHTML = `<li class="error-item">Error: ${message}</li>`;
        document.getElementById("missingSkills").innerHTML = '<li class="error-item">Try refreshing job details</li>';
        document.getElementById("matchedCount").textContent = "0";
        document.getElementById("missingCount").textContent = "0";
    }

    /**
    * Escape HTML special characters to prevent XSS attacks
    * @param {string} str - The string to escape
    * @returns {string} - The escaped string
    */
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateJobMatchUI(atsResult) {
        // Update counters
        document.getElementById("matchedCount").textContent = atsResult.matched_skills.length;
        document.getElementById("missingCount").textContent = atsResult.missing_skills.length;

        // Display ATS Score in match badge
        const matchBadge = document.getElementById("matchBadge");

        // Determine match level and apply appropriate class
        if (atsResult.ATS_score >= 80) {
            matchBadge.textContent = `Strong Match (${atsResult.ATS_score}%)`;
            matchBadge.className = "match-badge match-strong";
        } else if (atsResult.ATS_score >= 60) {
            matchBadge.textContent = `Good Match (${atsResult.ATS_score}%)`;
            matchBadge.className = "match-badge match-good";
        } else {
            matchBadge.textContent = `Weak Match (${atsResult.ATS_score}%)`;
            matchBadge.className = "match-badge match-weak";
        }

        // Update Matched Skills
        const matchedSkillsList = document.getElementById("matchedSkills");
        if (atsResult.matched_skills.length > 0) {
            matchedSkillsList.innerHTML = atsResult.matched_skills
                .map(skill => `<li>${escapeHTML(skill)}</li>`)
                .join("");
        } else {
            matchedSkillsList.innerHTML = '<li class="empty-item">No matching skills found</li>';
        }

        // Update Missing Skills
        const missingSkillsList = document.getElementById("missingSkills");
        if (atsResult.missing_skills.length > 0) {
            missingSkillsList.innerHTML = atsResult.missing_skills
                .map(skill => `<li>${escapeHTML(skill)}</li>`)
                .join("");
        } else {
            missingSkillsList.innerHTML = '<li class="empty-item">No missing skills identified</li>';
        }

        console.log("✅ Job Match UI Updated!");
    }

    function loadJobDetails() {
        const cachedTitle = localStorage.getItem("jobTitle");
        const cachedCompany = localStorage.getItem("jobCompany");
        const cachedDesc = localStorage.getItem("jobDescription");

        if (cachedTitle || cachedCompany || cachedDesc) {
            jobTitle.textContent = cachedTitle;
            companyName.textContent = cachedCompany;
            jobDesc.textContent = cachedDesc;
            showContentState();
        } else {
            refreshJobDetails();
        }
    }

    function showLoadingState() {
        jobError.style.display = "none";
        jobLoading.style.display = "block";
        jobTitle.textContent = "Loading...";
        companyName.textContent = "";
        jobDesc.textContent = "";
    }

    function showErrorState(message) {
        jobLoading.style.display = "none";
        jobError.style.display = "block";
        jobError.querySelector("p").textContent = message;
    }

    function showContentState() {
        jobLoading.style.display = "none";
        jobError.style.display = "none";
    }

    function toggleJobDescription() {
        isExpanded = !isExpanded;
        jobDesc.classList.toggle("expanded", isExpanded);
        expandBtn.textContent = isExpanded ? "Less" : "More";
    }

    function extractJobDetailsFromAnyPage() {
        const jobData = { title: "", company: "", description: "" };

        // 1. Check for JSON-LD structured data (common in job postings)
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent);
                if (data && data["@type"] === "JobPosting") {
                    jobData.title = data.title || "";
                    jobData.company = data.hiringOrganization?.name || "";
                    jobData.description = data.description || "";
                    return jobData;
                }
            } catch (e) { }
        }

        // 2. Check for meta tags (common in many websites)
        const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"]');
        const metaDescription = document.querySelector('meta[property="og:description"], meta[name="description"]');
        if (metaTitle) jobData.title = metaTitle.content;
        if (metaDescription) jobData.description = metaDescription.content;

        // 3. Fallback to document title if no meta title is found
        if (!jobData.title) jobData.title = document.title;

        // 4. Extract job description from common job description selectors
        const descriptionSelectors = [
            ".job-description", ".job-details", "[itemprop='description']",
            ".description", ".job-summary", ".job-body"
        ];
        for (const selector of descriptionSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                jobData.description = element.textContent.trim();
                break;
            }
        }

        // 5. If no description is found, extract from paragraphs and lists
        if (!jobData.description) {
            jobData.description = Array.from(document.querySelectorAll("p, li"))
                .map(el => el.textContent.trim())
                .filter(text => text.length > 30)
                .slice(0, 3)
                .join(" ");
        }

        // 6. Extract company name from common company name selectors
        const companySelectors = [
            ".company-name", ".company", "[itemprop='hiringOrganization']",
            "[data-testid='company-name']", ".employer-name", ".job-company"
        ];
        for (const selector of companySelectors) {
            const element = document.querySelector(selector);
            if (element) {
                jobData.company = element.textContent.trim();
                break;
            }
        }

        // 7. Fallback to extracting company name from the URL or other elements
        if (!jobData.company) {
            const url = window.location.href;
            const domain = url.match(/https?:\/\/(www\.)?([^\/]+)/);
            if (domain && domain[2]) {
                jobData.company = domain[2].split('.')[0]; // Extract company name from subdomain
            }
        }

        // 8. Additional fallback for job title (e.g., from headings)
        if (!jobData.title) {
            const headingSelectors = ["h1", "h2", "h3"];
            for (const selector of headingSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    jobData.title = element.textContent.trim();
                    break;
                }
            }
        }

        return jobData;
    }








    const copyButton = document.querySelector(".cover-letter-header button[data-tooltip='Copy to clipboard']");
    if (copyButton) {
        copyButton.addEventListener("click", function () {
            const coverLetterTextarea = document.getElementById("coverLetter");
            if (coverLetterTextarea && coverLetterTextarea.value) {
                navigator.clipboard.writeText(coverLetterTextarea.value)
                    .then(() => {
                        alert("Cover letter copied to clipboard!");
                    })
                    .catch(() => {
                        alert("Failed to copy cover letter to clipboard.");
                    });
            } else {
                alert("No cover letter to copy.");
            }
        });
    } else {
        console.error("Copy button not found in the DOM.");
    }


    const downloadButton = document.querySelector(".cover-letter-header button[data-tooltip='Save as file']");
    if (downloadButton) {
        downloadButton.addEventListener("click", function () {
            const coverLetterTextarea = document.getElementById("coverLetter");
            if (coverLetterTextarea && coverLetterTextarea.value) {
                const blob = new Blob([coverLetterTextarea.value], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "cover_letter.txt";
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert("No cover letter to download.");
            }
        });
    } else {
        console.error("Download button not found in the DOM.");
    }

    const generateCoverLetterButton = document.getElementById("generateCoverLetter");
    if (generateCoverLetterButton) {
        generateCoverLetterButton.addEventListener("click", async function () {
            await generateCoverLetter();
        });
    } else {
        console.error("Generate Cover Letter button not found in the DOM.");
    }

    const optimizeResumeButton = document.getElementById("optimizeResume");
    if (optimizeResumeButton) {
        optimizeResumeButton.addEventListener("click", async function () {
            await updateResumeSuggestions();
        });
    } else {
        console.error("Optimize Resume button not found in the DOM.");
    }





const autoFillButton = document.getElementById("autoFill");
    if (autoFillButton) {
        autoFillButton.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: autoFillForm
                });
            });
        });
    } else {
        console.error("Auto-Fill button not found in the DOM.");
    }
function autoFillForm() {
    const userDetails = {
        firstName: "Deepakkumar",
        lastName: "S",
        fullName: "Deepakkumar S",
        email: "deepakkumars11022005@gmail.com",
        phone: "+9087729108",
        linkedin: "https://linkedin.com/in/deepak1102"
    };

    const fieldSelectors = {
        name: [
            'input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="Full Name"]',
            'input[name*="fullname"]', 'input[id*="fullname"]', 'input[placeholder*="Complete Name"]',
            'input[name*="user_name"]', 'input[id*="user_name"]', 'input[placeholder*="User Name"]',
            'input[name*="applicant_name"]', 'input[id*="applicant_name"]', 'input[placeholder*="Applicant Name"]',
            'input[name*="display_name"]', 'input[id*="display_name"]', 'input[placeholder*="Display Name"]'
        ],
        firstName: [
            'input[name*="first"]', 'input[id*="first"]', 'input[placeholder*="First"]',
            'input[name*="fname"]', 'input[id*="fname"]', 'input[placeholder*="FName"]',
            'input[name*="given"]', 'input[id*="given"]', 'input[placeholder*="Given Name"]',
            'input[name*="user_first"]', 'input[id*="user_first"]', 'input[placeholder*="User First"]'
        ],
        lastName: [
            'input[name*="last"]', 'input[id*="last"]', 'input[placeholder*="Last"]',
            'input[name*="lname"]', 'input[id*="lname"]', 'input[placeholder*="LName"]',
            'input[name*="surname"]', 'input[id*="surname"]', 'input[placeholder*="Surname"]',
            'input[name*="family"]', 'input[id*="family"]', 'input[placeholder*="Family Name"]'
        ],
        email: [
            'input[name*="email"]', 'input[id*="email"]', 'input[placeholder*="Email"]',
            'input[name*="mail"]', 'input[id*="mail"]', 'input[placeholder*="Mail"]',
            'input[name*="contact_email"]', 'input[id*="contact_email"]', 'input[placeholder*="Contact Email"]',
            'input[name*="applicant_email"]', 'input[id*="applicant_email"]', 'input[placeholder*="Applicant Email"]'
        ],
        phone: [
            'input[name*="phone"]', 'input[id*="phone"]', 'input[placeholder*="Phone"]',
            'input[name*="mobile"]', 'input[id*="mobile"]', 'input[placeholder*="Mobile"]',
            'input[name*="contact_number"]', 'input[id*="contact_number"]', 'input[placeholder*="Contact Number"]',
            'input[name*="tel"]', 'input[id*="tel"]', 'input[placeholder*="Tel"]',
            'input[name*="user_phone"]', 'input[id*="user_phone"]', 'input[placeholder*="User Phone"]'
        ],
        linkedin: [
            'input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="LinkedIn"]',
            'input[name*="linkedin_profile"]', 'input[id*="linkedin_profile"]', 'input[placeholder*="LinkedIn Profile"]',
            'input[name*="li_profile"]', 'input[id*="li_profile"]', 'input[placeholder*="LI Profile"]',
            'input[name*="applicant_linkedin"]', 'input[id*="applicant_linkedin"]', 'input[placeholder*="Applicant LinkedIn"]'
        ]
    };

    Object.keys(fieldSelectors).forEach((key) => {
        let field = null;

        for (let selector of fieldSelectors[key]) {
            field = document.querySelector(selector);
            if (field) break;
        }

        if (field) {
            field.value = userDetails[key];
            field.dispatchEvent(new Event('input', { bubbles: true }));  
        } else {
            console.warn(`⚠ Could not find field for: ${key}`);
        }
    });

    alert("Form auto-filled successfully!");
}





});













const loadingState = document.getElementById("loadingState");
loadingState.style.display = "none";
async function updateResumeSuggestions() {
    const resumeContents = localStorage.getItem("resumeData");
    const jobDesc = localStorage.getItem("jobTitle") + " " + localStorage.getItem("jobDescription") + " " + localStorage.getItem("jobCompany");

    const loadingState = document.getElementById("loadingState");
    const resumeSuggestions = document.getElementById("resumeSuggestions");

    try {
        loadingState.style.display = "flex";
        resumeSuggestions.style.display = "none";

        const AtsOptimization = await getGeminiResponseForResumeUpdation(resumeContents, jobDesc);
        const improvements = JSON.parse(AtsOptimization).improvements;

        let suggestionsHTML = "";
        for (const category in improvements) {
            if (improvements.hasOwnProperty(category)) {
                suggestionsHTML += `<strong>${category}:</strong><br>`;
                improvements[category].forEach(suggestion => {
                    suggestionsHTML += `• ${suggestion}<br>`;
                });
            }
        }

        resumeSuggestions.innerHTML = suggestionsHTML;
        loadingState.style.display = "none";
        resumeSuggestions.style.display = "block";
    } catch (error) {
        console.error("Error updating resume suggestions:", error);
        loadingState.style.display = "none";
        resumeSuggestions.style.display = "block";
        resumeSuggestions.innerHTML = "Error fetching suggestions. Please try again later.";
    }
}


async function getGeminiResponseForResumeUpdation(resumeContents, jobDesc) {
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Here is a job description:  
                                ${jobDesc}
                                
                                Here is my resume:  
                                ${resumeContents}  
                                
                                I want you to analyze my resume based on the job description and provide a list of *specific* improvements.  
                                - Identify missing skills, experience gaps, and *keywords* relevant to the job.  
                                - Suggest *exact keywords* that should be added to align with the job description.  
                                - Focus on *ATS (Applicant Tracking System) optimization* by recommending industry-specific terms.  
                                - Keep the suggestions *concise, actionable, and tailored* to this job.  
                                - Avoid general feedback; give *targeted* recommendations only.  

                                Provide the response in the following format:  

                                1. *Skills to Add/Improve*:  
                                - [Skill 1] (Found in job description but missing in resume)  
                                - [Skill 2] (Mentioned in JD but needs emphasis)  

                                2. *Experience Enhancements*:  
                                - Modify [Job Role] description to highlight [specific achievement].  
                                - Add quantifiable results (e.g., “Increased efficiency by 20%” instead of “Improved efficiency”).  

                                3. *Keyword Optimization (Important for ATS)*:  
                                - Add *"[Relevant Keyword]"* under [Section] to align with JD.  
                                - Replace *"[Generic Term]"* with *"[Stronger Industry-Specific Term]"*.  
                                - Ensure *"[Technical Keyword]"* appears at least once in *Skills/Experience sections*.  

                                4. *Other Improvements*:  
                                - Remove irrelevant content like [Example].  
                                - Improve formatting for better readability. 
                                
                                Don't brief the contents at all; just give keywords and include bracket things too.

                                Provide the response in JSON format:
                                {
                                    "improvements": {
                                        "1. Skills to Add/Improve": [
                                            "- [Skill 1] (Found in job description but missing in resume)",
                                            "- [Skill 2] (Mentioned in JD but needs emphasis)"
                                        ],
                                        "2. Experience Enhancements": [
                                            "- Modify [Job Role] description to highlight [specific achievement].",
                                            "- Add quantifiable results (e.g., “Increased efficiency by 20%”)."
                                        ],
                                        "3. Keyword Optimization (Important for ATS)": [
                                            "- Add *\"[Relevant Keyword]\"* under [Section] to align with JD.",
                                            "- Replace *\"[Generic Term]\"* with *\"[Stronger Industry-Specific Term]\"*."
                                        ],
                                        "4. Other Improvements": [
                                            "- Remove irrelevant content like [Example].",
                                            "- Improve formatting for better readability."
                                        ]
                                    }
                                }`
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        if (data.candidates && data.candidates.length > 0) {
            if (data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                const responseText = data.candidates[0].content.parts[0].text;


                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonText = jsonMatch[0];
                    return jsonText;
                } else {
                    throw new Error("No valid JSON found in the response.");
                }
            }
        }
        return '{"improvements": {}}';
    } catch (error) {
        console.error('Error:', error);
        return '{"improvements": {}}';
    }
}












async function generateCoverLetter() {
    const coverLetterTextarea = document.getElementById("coverLetter");
    if (!coverLetterTextarea) return;

    const jobTitle = localStorage.getItem("jobTitle");
    const jobCompany = localStorage.getItem("jobCompany");
    const jobDescription = localStorage.getItem("jobDescription");
    const resumeJson = localStorage.getItem("resumeData");

    if (!jobTitle || !jobCompany || !jobDescription || !resumeJson) {
        coverLetterTextarea.value = "Please upload your resume and refresh job details first.";
        return;
    }

    // Show loading state
    coverLetterTextarea.value = "Generating your personalized cover letter...";

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const resumeContents = resumeJson;
    const jobDesc = `Position: ${jobTitle} and Company: ${jobCompany} and Job Description: ${jobDescription.substring(0, 500)}`;
    console.log(resumeContents + " " + jobDesc + "////////////////");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `I need you to generate a *personalized cover letter* based on the following job description and my resume.  

                                #### *Job Description:*  
                                ${jobDesc}

                                #### *My Resume:*  
                                ${resumeContents}

                                ### *Instructions:*  
                                - The cover letter should be *tailored* to the job description.  
                                - Start with a *strong opening* that expresses enthusiasm for the role.  
                                - Highlight *my most relevant skills and experience* that match the job.  
                                - Use *specific achievements* from my resume to show why I’m the best fit.  
                                - Keep the tone *professional yet engaging* (avoid generic statements).  
                                - End with a *strong closing statement* and a call to action.  

                                ### *Format:*  
                                1. *Opening Paragraph:*  
                                - Express interest in the role and the company.  
                                - Briefly mention why you’re a strong candidate.  

                                2. *Body Paragraphs:*  
                                - Highlight *key skills and experience* that align with the job description.  
                                - Provide *specific achievements* to demonstrate your impact.  
                                - Show enthusiasm for the company’s mission and values.  

                                3. *Closing Paragraph:*  
                                - Reiterate interest and eagerness to contribute.  
                                - Include a *call to action* (e.g., "I’d love the opportunity to discuss this role further").  
                                - Thank the employer for their time and consideration.  

                                ### *Tone & Length:*  
                                - Keep it *concise (one page)* and *impactful*.  
                                - Use *professional, confident, and engaging language*.  

                                Generate the *cover letter* based on these details.
                                remove the extra sysmbols, unkonwn data ,date, hr name from response   
                                simply provide dear HR
                                Replace Your Name, Your Address, Your Phone Number, Your Email Address, Hiring Manager Name, Hiring Manager Title with given contents.`
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        if (data.candidates && data.candidates.length > 0) {
            if (data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                const coverLetterText = data.candidates[0].content.parts[0].text;
                coverLetterTextarea.value = coverLetterText;
                return;
            }
        }
        coverLetterTextarea.value = "No cover letter generated. Please try again.";
    } catch (error) {
        console.error('Error:', error);
        coverLetterTextarea.value = "Error generating cover letter. Please try again.";
    }
}




