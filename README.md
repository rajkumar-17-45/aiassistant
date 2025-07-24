Here’s a **README.md** file for your project. This document provides an overview of your Chrome extension, its features, installation instructions, and usage guidelines. You can customize it further based on your specific needs.

---

# AI Assistant for Job Applications



**AI Assistant for Job Applications** is a Chrome extension designed to help job seekers streamline their job application process. It provides tools for resume optimization, job matching, cover letter generation, and auto-filling job application forms.

---

## Features

1. **Resume Upload and Parsing**:
   - Upload your resume in PDF format.
   - Extract and store resume data (e.g., name, contact info, skills, experience) for use in other features.

2. **Job Details Extraction**:
   - Automatically extract job details (title, company, description) from job posting pages.
   - Refresh job details with a single click.

3. **Job Matching**:
   - Compare your resume with the job description.
   - Calculate an ATS (Applicant Tracking System) score.
   - Highlight matched and missing skills.

4. **ATS Optimization**:
   - Get actionable suggestions to optimize your resume for ATS compatibility.
   - Improve keyword usage and formatting.

5. **Cover Letter Generation**:
   - Generate personalized cover letters tailored to the job description.
   - Copy or download the cover letter as a `.txt` file.

6. **Auto-Fill Job Applications**:
   - Automatically fill job application forms with your resume data.
   - Supports common input fields like name, email, phone, and LinkedIn profile.

---

## Installation

### Prerequisites
- Google Chrome browser.
- A Google account (for accessing the Gemini API).

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ai-job-assistant.git
   cd ai-job-assistant
   ```

2. **Load the Extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer Mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the `ai-job-assistant` folder.

3. **Set Up Gemini API Key**:
   - Obtain a Gemini API key from [Google Cloud Console](https://console.cloud.google.com/).
   - Replace `GEMINI_API_KEY` in `scripts.js` with your actual API key.

4. **Start Using the Extension**:
   - Click the extension icon in the Chrome toolbar to open the popup.
   - Follow the on-screen instructions to upload your resume and use the features.

---

## Usage

### 1. Resume Upload
- Click the **Upload Resume** button to upload your resume in PDF format.
- The extension will parse your resume and store the data for future use.

### 2. Job Details Extraction
- Navigate to a job posting page.
- Click the **Refresh Job Details** button to extract job details.

### 3. Job Matching
- After extracting job details, the extension will automatically compare your resume with the job description.
- View matched and missing skills, along with an ATS score.

### 4. ATS Optimization
- Click the **Optimize Resume** button to get suggestions for improving your resume.

### 5. Cover Letter Generation
- Click the **Generate Cover Letter** button to create a personalized cover letter.
- Use the **Copy to Clipboard** or **Download** buttons to save the cover letter.

### 6. Auto-Fill Job Applications
- Navigate to a job application form.
- Click the **Auto-Fill Job Application** button to automatically fill the form with your resume data.

---

## Screenshots
![Resume Upload](https://raw.githubusercontent.com/deepakkumar11022005/AI-Assistance-for-Job-Application/main/AI%20Assist%20page1.png)

![Job Matching](https://raw.githubusercontent.com/deepakkumar11022005/AI-Assistance-for-Job-Application/main/AI%20Assist%20page2.png)

![Cover Letter Generation](https://raw.githubusercontent.com/deepakkumar11022005/AI-Assistance-for-Job-Application/main/AI%20Assist%20page2.png)

![Auto-Fill](https://raw.githubusercontent.com/deepakkumar11022005/AI-Assistance-for-Job-Application/main/AI%20Assist%20page3.png)


---

## Technologies Used

- **Frontend**:
  - HTML, CSS, JavaScript
  - Chrome Extensions API

- **Backend**:
  - Gemini API (for AI-powered features)

- **Libraries**:
  - PDF.js (for parsing PDF resumes)

---

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeatureName`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeatureName`).
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Thanks to [Google Gemini](https://ai.google/) for providing the AI API.
- Inspired by the need to simplify the job application process for job seekers.

---

## Contact

For questions or feedback, please contact:

- **Deepakkumar S**  
  Email: deepakkumars11022005@gmail.com  
  GitHub: [Deepakkumar1102](https://github.com/Deepakkumar1102)

---

Enjoy using the **AI Assistant for Job Applications**! 🚀

---

### Customization
- Replace `your-username` with your GitHub username.
- Add screenshots of your extension in action.
- Update the contact information with your details.

This README provides a comprehensive overview of your project and helps users understand how to use it effectively.
