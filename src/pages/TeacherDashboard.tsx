/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  createClass,
  mintNFT,
  createLecture,
  getClasses,
  getLectures,
  getAttendanceRecords,
  createQuiz,
  addQuizQuestion,
  addMultipleQuizQuestions,
  getQuizzes,
  getQuizzesByLecture,
  getQuizResults,
  deactivateQuiz,
  deployQuizContract,
  linkQuizToClass,
  getClassQuizzes,
  getNotesContractForClass,
  createNotesContract,
} from "@/lib/contractService";
import { useWalletContext } from "@/context/WalletContext";
import QRious from "qrious";
import { motion } from "framer-motion";
import Popup from "../components/Popup";
import StudentForm from "../components/StudentForm";
import CreateClassForm from "../components/CreateClassForm";
import CreateQuizForm from "../components/CreateQuizForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  GraduationCap,
  BookOpen,
  Edit,
  Eye,
  FilePieChart,
  Link,
  FileText,
  LoaderCircle,
  CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ethers } from "ethers";
import ClassContract from "@/lib/contracts/ClassContract.sol/ClassContract.json";

interface Class {
  id: string;
  name: string;
  studentCount: number;
  lectureCount: number;
  classAddress: string;
}

interface Lecture {
  id: number;
  topic: string;
}

interface LecturesByClass {
  [classAddress: string]: Lecture[];
}

interface AttendanceByLecture {
  [key: string]: AttendanceRecord[]; // key will be `${classAddress}-${lectureId}`
}

interface AttendanceRecord {
  address: string;
  name: string;
}

interface LectureTopicsByClass {
  [classAddress: string]: string;
}

interface PopupContentType {
  title: string;
  content: React.ReactNode;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  createdAt: number;
  expiresAt: number;
  lectureId: number;
  isActive: boolean;
  questionCount: number;
}

interface QuizzesByContract {
  [quizContractAddress: string]: Quiz[];
}

interface QuizResultsByStudent {
  address: string;
  name: string;
  score: number;
  totalQuestions: number;
  attemptedAt: number;
}

interface NotesContractsByClass {
  [classAddress: string]: string;
}

export function TeacherDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [lecturesByClass, setLecturesByClass] = useState<LecturesByClass>({});
  const [attendanceByLecture, setAttendanceByLecture] =
    useState<AttendanceByLecture>({});
  const [qrData, setQrData] = useState<string | null>(null);
  const [lectureTopicsByClass, setLectureTopicsByClass] =
    useState<LectureTopicsByClass>({});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<PopupContentType | null>(
    null
  );
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isCreatingLecture, setIsCreatingLecture] = useState<{
    [key: string]: boolean;
  }>({});
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isFetchingLectures, setIsFetchingLectures] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  // Quiz related state
  const [quizzesByContract, setQuizzesByContract] = useState<QuizzesByContract>(
    {}
  );
  const [quizContractsByClass, setQuizContractsByClass] = useState<{
    [classAddress: string]: string[];
  }>({});
  const [isFetchingQuizzes, setIsFetchingQuizzes] = useState<{
    [key: string]: boolean;
  }>({});
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [isDeployingQuizContract, setIsDeployingQuizContract] = useState(false);
  const [isLinkingQuizContract, setIsLinkingQuizContract] = useState(false);
  const [selectedLectureForQuiz, setSelectedLectureForQuiz] = useState<{
    lectureId: number;
    classAddress: string;
  } | null>(null);
  const [quizResultsByQuiz, setQuizResultsByQuiz] = useState<{
    [key: string]: QuizResultsByStudent[];
  }>({});
  const [newQuizContractAddress, setNewQuizContractAddress] = useState("");

  // Notes related state
  const [notesContractsByClass, setNotesContractsByClass] =
    useState<NotesContractsByClass>({});
  const [isCreatingNotesContract, setIsCreatingNotesContract] = useState(false);

  const { provider, address } = useWalletContext();

  // Add a new state for the selected class
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingInitialData(true);
        const classList = await getClasses(provider);
        const formattedClasses = classList.map((classData) => ({
          classAddress: classData[0],
          name: classData[1],
          symbol: classData[2],
          studentCount: 0,
          lectureCount: 0,
        }));
        setClasses(formattedClasses);

        // Set the first class as selected by default if available
        if (formattedClasses.length > 0 && !selectedClass) {
          setSelectedClass(formattedClasses[0].classAddress);
        }

        // For each class, fetch associated quiz contracts
        for (const classItem of formattedClasses) {
          try {
            const quizContracts = await getClassQuizzes(
              classItem.classAddress,
              provider
            );
            setQuizContractsByClass((prev) => ({
              ...prev,
              [classItem.classAddress]: quizContracts,
            }));

            // Fetch lectures for each class
            await fetchLectures(classItem.classAddress);

            // Fetch quizzes for each quiz contract
            for (const quizContractAddress of quizContracts) {
              await fetchQuizzes(quizContractAddress);
            }
          } catch (error) {
            console.error(
              `Error fetching quiz contracts for class ${classItem.classAddress}:`,
              error
            );
          }

          // Get notes contract for this class
          try {
            const notesContract = await getNotesContractForClass(
              classItem.classAddress,
              provider
            );
            if (
              notesContract &&
              notesContract !== "0x0000000000000000000000000000000000000000"
            ) {
              setNotesContractsByClass((prev) => ({
                ...prev,
                [classItem.classAddress]: notesContract,
              }));
            }
          } catch (error) {
            console.error(
              `Error fetching notes contract for class ${classItem.classAddress}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setConfirmationMessage(
          "Failed to load classes. Please refresh the page."
        );
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    fetchInitialData();
  }, [provider, selectedClass]);

  const handleCreateLecture = async (classAddress: string) => {
    try {
      setIsCreatingLecture((prev) => ({
        ...prev,
        [classAddress]: true,
      }));

      // Assuming you have a function to get the lecture topic
      const topic = lectureTopicsByClass[classAddress];
      if (!topic) {
        throw new Error("Lecture topic is required.");
      }
      const tx = await createLecture(classAddress, topic, provider);

      setConfirmationMessage(`Lecture "${topic}" created successfully!`);
      await fetchLectures(classAddress);
    } catch (error) {
      console.error("Error creating lecture:", error);
      setConfirmationMessage("Failed to create lecture. Please try again.");
    } finally {
      setIsCreatingLecture((prev) => ({
        ...prev,
        [classAddress]: false,
      }));
    }
  };

  useEffect(() => {
    if (qrData && isPopupOpen) {
      const canvasElements = document.querySelectorAll(
        'canvas[id^="qr-code-"]'
      );
      canvasElements.forEach((canvas) => {
        try {
          new QRious({
            element: canvas,
            value: qrData,
            size: 250,
          });
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      });
    }
  }, [qrData, isPopupOpen]);

  const openMintForm = (classId: string) => {
    const handleFormSubmit = async (formData: {
      address: string;
      name: string;
      details: string;
    }) => {
      try {
        setIsAddingStudent(true);
        await mintNFT(classId, formData.address, formData.name, provider);
        setConfirmationMessage(`Student ${formData.name} added successfully!`);
        setIsPopupOpen(false);
      } catch (error) {
        console.error("Error adding student:", error);
        setConfirmationMessage("Failed to add student. Please try again.");
      } finally {
        setIsAddingStudent(false);
      }
    };

    setPopupContent({
      title: "Add New Student",
      content: (
        <StudentForm
          onSubmit={handleFormSubmit}
          isAddingStudent={isAddingStudent}
        />
      ),
    });
    setIsPopupOpen(true);
  };

  const fetchLectures = async (classAddress: string) => {
    try {
      setIsFetchingLectures((prev) => ({ ...prev, [classAddress]: true }));
      const lecturesList = await getLectures(classAddress, provider);
      console.log("Fetched lectures:", lecturesList);
      setLecturesByClass((prev) => ({
        ...prev,
        [classAddress]: lecturesList,
      }));
    } catch (error) {
      console.error("Error fetching lectures:", error);
      setConfirmationMessage("Failed to fetch lectures. Please try again.");
      // Make sure to update state even when there's an error
      setLecturesByClass((prev) => ({
        ...prev,
        [classAddress]: prev[classAddress] || [], // Keep previous lectures or use empty array
      }));
    } finally {
      setIsFetchingLectures((prev) => ({ ...prev, [classAddress]: false }));
    }
  };

  const handleTakeAttendance = (id: number, classAddress: string) => {
    const qrData = JSON.stringify({
      lectureId: id,
      classAddress: classAddress,
    });
    setQrData(qrData);

    const qrContent = (
      <div className="space-y-4">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-indigo-300">
            Scan QR Code to Mark Attendance
          </h3>
          <div className="p-4 bg-white rounded-lg shadow-md">
            <canvas id={`qr-code-${id}`} className="mb-2" />
          </div>
          <p className="text-sm text-gray-400 mt-3 text-center">
            Students can scan this QR code to mark their attendance for this
            lecture.
          </p>
        </div>
      </div>
    );

    setPopupContent({
      title: "Take Attendance",
      content: qrContent,
    });
    setIsPopupOpen(true);
  };

  const fetchAttendanceRecords = async (
    lectureId: any,
    classAddress: string
  ) => {
    const [records, names] = await getAttendanceRecords(
      classAddress,
      lectureId,
      provider
    );
    console.log("Fetched attendance records:", records);
    console.log("Fetched student names:", names);
    const attendanceRecords = records.map((address, index) => ({
      address,
      name: names[index],
    }));
    const key = `${classAddress}-${lectureId}`;
    setAttendanceByLecture((prev) => ({
      ...prev,
      [key]: attendanceRecords,
    }));
  };

  const handleViewAttendance = async (
    lectureId: number,
    classAddress: string
  ) => {
    // Show loading state in popup first
    setPopupContent({
      title: "Attendance Records",
      content: <div className="text-center">Loading attendance records...</div>,
    });
    setIsPopupOpen(true);

    // Fetch records directly
    const [records, names] = await getAttendanceRecords(
      classAddress,
      lectureId,
      provider
    );
    const attendanceRecords = records.map((address: string, index: number) => ({
      address,
      name: names[index],
    }));

    // Update state for other uses
    const key = `${classAddress}-${lectureId}`;
    setAttendanceByLecture((prev) => ({
      ...prev,
      [key]: attendanceRecords,
    }));

    const attendanceContent = (
      <div className="space-y-4">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-indigo-300">
              Attendance Records
            </h3>
            <Button
              onClick={() => downloadAttendanceData(classAddress, lectureId)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              Download Records
            </Button>
          </div>

          <div className="mb-6">
            <h4 className="text-md font-semibold mb-2 text-gray-300">
              Attendance:
            </h4>
            {attendanceRecords.length > 0 ? (
              <ul className="space-y-2">
                {attendanceRecords.map((student) => (
                  <li
                    key={student.address}
                    className="p-2 bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700"
                  >
                    <span className="font-semibold text-white">
                      {student.name}
                    </span>
                    <br />
                    <span className="text-sm text-gray-400">
                      {student.address}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No attendance records yet.</p>
            )}
          </div>
        </div>
      </div>
    );

    // Update popup with combined data
    setPopupContent({
      title: "Attendance Records",
      content: attendanceContent,
    });
  };

  const downloadAttendanceData = (classAddress: string, lectureId: number) => {
    const key = `${classAddress}-${lectureId}`;
    const records = attendanceByLecture[key];

    if (!records || records.length === 0) {
      alert("No attendance records available to download.");
      return;
    }

    const csvRows = [
      ["Address", "Name"],
      ...records.map((record) => [record.address, record.name]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvRows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance_records.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setPopupContent(null);
  };

  const openCreateClassForm = () => {
    const handleFormSubmit = async (formData: {
      name: string;
      symbol: string;
    }) => {
      try {
        setIsCreatingClass(true);
        await createClass(formData.name, formData.symbol, provider);

        setConfirmationMessage(`Class ${formData.name} created successfully!`);
        setIsPopupOpen(false);

        // Update the classes list
        const classList = await getClasses(provider);
        const formattedClasses = classList.map((classData) => ({
          classAddress: classData[0],
          name: classData[1],
          symbol: classData[2],
          studentCount: 0,
          lectureCount: 0,
        }));
        setClasses(formattedClasses);
      } catch (error) {
        console.error("Error creating class:", error);
        setConfirmationMessage("Failed to create class. Please try again.");
      } finally {
        setIsCreatingClass(false);
      }
    };

    setPopupContent({
      title: "Create New Class",
      content: (
        <CreateClassForm
          onSubmit={handleFormSubmit}
          isCreating={isCreatingClass}
        />
      ),
    });
    setIsPopupOpen(true);
  };

  const fetchQuizzes = async (quizContractAddress: string) => {
    try {
      setIsFetchingQuizzes((prev) => ({
        ...prev,
        [quizContractAddress]: true,
      }));
      const quizzesList = await getQuizzes(quizContractAddress, provider);
      setQuizzesByContract((prev) => ({
        ...prev,
        [quizContractAddress]: quizzesList,
      }));
    } catch (error) {
      console.error(
        `Error fetching quizzes for contract ${quizContractAddress}:`,
        error
      );
      setConfirmationMessage("Failed to fetch quizzes. Please try again.");
    } finally {
      setIsFetchingQuizzes((prev) => ({
        ...prev,
        [quizContractAddress]: false,
      }));
    }
  };

  const openCreateQuizForm = (
    quizContractAddress: string,
    classAddress: string
  ) => {
    const classLectures = lecturesByClass[classAddress] || [];

    const handleFormSubmit = async (formData: {
      title: string;
      description: string;
      expiresAt: number;
      lectureId: number;
      questions: Array<{
        text: string;
        options: string[];
        correctOptionIndex: number;
      }>;
    }) => {
      try {
        setIsCreatingQuiz(true);

        // Create the quiz
        const quizId = await createQuiz(
          quizContractAddress,
          formData.title,
          formData.description,
          formData.expiresAt,
          formData.lectureId,
          provider
        );

        // Use the new addMultipleQuizQuestions function instead of adding questions one by one
        await addMultipleQuizQuestions(
          quizContractAddress,
          quizId,
          formData.questions.map((q) => ({
            questionText: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
          })),
          provider
        );

        setConfirmationMessage(
          `Quiz "${formData.title}" created successfully!`
        );
        await fetchQuizzes(quizContractAddress);
        setIsPopupOpen(false);
      } catch (error) {
        console.error("Error creating quiz:", error);
        setConfirmationMessage("Failed to create quiz. Please try again.");
      } finally {
        setIsCreatingQuiz(false);
      }
    };

    setPopupContent({
      title: "Create New Quiz",
      content: (
        <CreateQuizForm
          onSubmit={handleFormSubmit}
          lectures={classLectures}
          isCreatingQuiz={isCreatingQuiz}
        />
      ),
    });
    setIsPopupOpen(true);
  };

  // New function that directly returns results without relying on state updates
  const fetchQuizResultsByQuizDirect = async (
    quizId: number,
    quizContractAddress: string,
    classAddress: string
  ) => {
    try {
      // First, attempt to get all students from the class contract
      const signer = provider.getSigner();
      const classContract = new ethers.Contract(
        classAddress,
        ClassContract.abi,
        signer
      );
      const totalSupply = await classContract.totalSupply();
      console.log(`Total students in class: ${totalSupply.toNumber()}`);

      // Initialize empty arrays for student data
      const addresses = [];
      const names = [];

      // Get all student addresses and names
      for (let i = 1; i <= totalSupply.toNumber(); i++) {
        try {
          const studentAddress = await classContract.ownerOf(i);
          const studentName = await classContract.getStudentName(i);
          addresses.push(studentAddress);
          names.push(studentName);
        } catch (error) {
          console.error(`Error getting student at index ${i}:`, error);
        }
      }

      console.log(`Found ${addresses.length} students in the class`);

      // Get results for each student
      const results: QuizResultsByStudent[] = [];

      // Process students sequentially (more reliable than parallel processing in this case)
      for (let i = 0; i < addresses.length; i++) {
        try {
          const studentAddress = addresses[i];
          const studentName = names[i];

          const result = await getQuizResults(
            quizContractAddress,
            quizId,
            studentAddress,
            provider
          );

          if (result.hasAttempted) {
            results.push({
              address: studentAddress,
              name: studentName,
              score: result.score,
              totalQuestions: result.totalQuestions,
              attemptedAt: result.attemptedAt,
            });
          }
        } catch (error) {
          console.error(
            `Error fetching result for student ${addresses[i]}:`,
            error
          );
        }
      }

      console.log(
        `Found ${results.length} students who attempted quiz ${quizId} (direct method)`
      );

      // Also update the state for consistency (but we're not relying on it for the UI)
      setQuizResultsByQuiz((prev) => ({
        ...prev,
        [`${quizContractAddress}-${quizId}`]: results,
      }));

      return results;
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      setConfirmationMessage("Failed to fetch quiz results. Please try again.");

      // Return empty array to avoid null/undefined issues
      return [];
    }
  };

  const handleDeactivateQuiz = async (
    quizId: number,
    quizContractAddress: string
  ) => {
    try {
      await deactivateQuiz(quizContractAddress, quizId, provider);
      setConfirmationMessage("Quiz deactivated successfully!");

      // Refresh quizzes
      await fetchQuizzes(quizContractAddress);
    } catch (error) {
      console.error("Error deactivating quiz:", error);
      setConfirmationMessage("Failed to deactivate quiz. Please try again.");
    }
  };

  const handleViewQuizResults = async (
    quizId: number,
    quizContractAddress: string,
    classAddress: string,
    title: string
  ) => {
    // First show a loading popup
    setPopupContent({
      title: `Results: ${title}`,
      content: (
        <div className="flex flex-col items-center justify-center py-8">
          <LoaderCircle className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading quiz results...
          </p>
        </div>
      ),
    });
    setIsPopupOpen(true);

    // Then fetch the results directly without relying on state updates
    try {
      // Directly get and use the results
      const results = await fetchQuizResultsByQuizDirect(
        quizId,
        quizContractAddress,
        classAddress
      );

      console.log(
        `Displaying ${results.length} results for quiz ${quizId} (direct results)`
      );

      // Update the popup with results
      setPopupContent({
        title: `Results: ${title}`,
        content: (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              {results.length}{" "}
              {results.length === 1 ? "student has" : "students have"} attempted
              this quiz
            </div>

            {results.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 font-medium text-sm py-2 border-b border-gray-700">
                  <div className="text-indigo-300">Student</div>
                  <div className="text-indigo-300">Score</div>
                </div>

                {results.map((result, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 text-sm py-2 border-b border-gray-700"
                  >
                    <div className="text-white">{result.name}</div>
                    <div className="text-white">
                      {result.score}/{result.totalQuestions} (
                      {Math.round((result.score / result.totalQuestions) * 100)}
                      %)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
                <FilePieChart className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                <p className="text-gray-300">
                  No students have attempted this quiz yet.
                </p>
              </div>
            )}

            <Button
              onClick={() => downloadQuizResults(quizId, title, results)}
              className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              Download Results CSV
            </Button>
          </div>
        ),
      });
    } catch (error) {
      console.error("Error loading quiz results:", error);
      setPopupContent({
        title: `Results: ${title}`,
        content: (
          <div className="text-center py-6 text-red-500">
            Error loading quiz results. Please try again.
          </div>
        ),
      });
    }
  };

  const downloadQuizResults = (
    quizId: number,
    quizTitle: string,
    results: QuizResultsByStudent[]
  ) => {
    const rows = [
      [
        "Student Name",
        "Address",
        "Score",
        "Total Questions",
        "Percentage",
        "Attempted At",
      ],
      ...results.map((r) => [
        r.name,
        r.address,
        r.score.toString(),
        r.totalQuestions.toString(),
        `${Math.round((r.score / r.totalQuestions) * 100)}%`,
        new Date(r.attemptedAt).toLocaleString(),
      ]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quiz_${quizId}_${quizTitle.replace(/\s+/g, "_")}_Results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshQuizContracts = async (classAddress: string) => {
    try {
      const quizContracts = await getClassQuizzes(classAddress, provider);
      setQuizContractsByClass((prev) => ({
        ...prev,
        [classAddress]: quizContracts,
      }));

      // Fetch quizzes for each contract
      for (const quizContractAddress of quizContracts) {
        await fetchQuizzes(quizContractAddress);
      }

      setConfirmationMessage("Quiz contracts refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing quiz contracts:", error);
      setConfirmationMessage(
        "Failed to refresh quiz contracts. Please try again."
      );
    }
  };

  // Quiz related functions
  const handleDeployQuizContract = async () => {
    try {
      setIsDeployingQuizContract(true);
      const quizContractAddress = await deployQuizContract(address, provider);
      setNewQuizContractAddress(quizContractAddress);
      setConfirmationMessage(
        `Quiz contract deployed at: ${quizContractAddress}`
      );
    } catch (error) {
      console.error("Error deploying quiz contract:", error);
      setConfirmationMessage(
        "Failed to deploy quiz contract. Please try again."
      );
    } finally {
      setIsDeployingQuizContract(false);
    }
  };

  const handleLinkQuizContract = async (
    classAddress: string,
    quizContractAddress: string
  ) => {
    if (!quizContractAddress) {
      setConfirmationMessage("Please enter a quiz contract address.");
      return;
    }

    try {
      setIsLinkingQuizContract(true);
      await linkQuizToClass(classAddress, quizContractAddress, provider);

      // Update quiz contracts for this class
      const quizContracts = await getClassQuizzes(classAddress, provider);
      setQuizContractsByClass((prev) => ({
        ...prev,
        [classAddress]: quizContracts,
      }));

      // Fetch quizzes for the newly linked contract
      await fetchQuizzes(quizContractAddress);

      setConfirmationMessage("Quiz contract linked successfully!");
      setNewQuizContractAddress("");
    } catch (error) {
      console.error("Error linking quiz contract:", error);
      setConfirmationMessage(
        "Failed to link quiz contract. Please check the address and try again."
      );
    } finally {
      setIsLinkingQuizContract(false);
    }
  };

  const openLinkQuizContractForm = (classAddress: string) => {
    setPopupContent({
      title: "Quiz Management",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 mb-4">
            Enable the quiz feature to create and manage quizzes for your
            students.
          </p>
          {newQuizContractAddress ? (
            <Button
              onClick={() =>
                handleLinkQuizContract(classAddress, newQuizContractAddress)
              }
              disabled={isLinkingQuizContract}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {isLinkingQuizContract ? "Linking..." : "Link Existing Contract"}
            </Button>
          ) : (
            <Button
              onClick={() => handleDeployAndLinkQuizContract(classAddress)}
              disabled={isDeployingQuizContract || isLinkingQuizContract}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {isDeployingQuizContract
                ? "Deploying Contract..."
                : isLinkingQuizContract
                ? "Linking Contract..."
                : "Enable Quiz"}
            </Button>
          )}
        </div>
      ),
    });
    setIsPopupOpen(true);
  };

  // New function to handle both deployment and linking in one flow
  const handleDeployAndLinkQuizContract = async (classAddress: string) => {
    try {
      // First show deploying state
      setIsDeployingQuizContract(true);
      setConfirmationMessage("Deploying new quiz contract...");

      // Deploy the quiz contract
      const quizContractAddress = await deployQuizContract(address, provider);

      if (!quizContractAddress) {
        throw new Error("Failed to deploy quiz contract - no address returned");
      }

      setConfirmationMessage(
        `Quiz contract deployed at: ${quizContractAddress}. Now linking to class...`
      );

      // Then link it to the class
      setIsLinkingQuizContract(true);
      setIsDeployingQuizContract(false);

      await linkQuizToClass(classAddress, quizContractAddress, provider);

      // Update quiz contracts for this class
      const quizContracts = await getClassQuizzes(classAddress, provider);
      setQuizContractsByClass((prev) => ({
        ...prev,
        [classAddress]: quizContracts,
      }));

      // Fetch quizzes for the newly linked contract
      await fetchQuizzes(quizContractAddress);

      setConfirmationMessage("Quiz contract successfully deployed and linked!");
      setNewQuizContractAddress("");
      setIsPopupOpen(false);
    } catch (error) {
      console.error("Error in deploy and link process:", error);
      setConfirmationMessage(
        `Failed to complete the process: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsDeployingQuizContract(false);
      setIsLinkingQuizContract(false);
    }
  };

  const handleCreateNotesContract = async (
    classAddress: string,
    className: string
  ) => {
    try {
      setIsCreatingNotesContract(true);

      const notesContractAddress = await createNotesContract(
        address,
        className,
        classAddress,
        provider
      );

      if (notesContractAddress) {
        setNotesContractsByClass((prev) => ({
          ...prev,
          [classAddress]: notesContractAddress,
        }));

        setConfirmationMessage("Notes contract created successfully!");
      } else {
        setConfirmationMessage(
          "Failed to create notes contract. Please try again."
        );
      }
    } catch (error) {
      console.error("Error creating notes contract:", error);
      setConfirmationMessage(
        "Failed to create notes contract. Please try again."
      );
    } finally {
      setIsCreatingNotesContract(false);
    }
  };

  const renderNotesSection = (classAddress: string, className: string) => {
    const notesContractAddress = notesContractsByClass[classAddress];

    if (!notesContractAddress) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-indigo-300">
              Notes Management
            </h3>
            <Button
              onClick={() => handleCreateNotesContract(classAddress, className)}
              disabled={isCreatingNotesContract}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {isCreatingNotesContract
                ? "Creating..."
                : "Create Notes Contract"}
            </Button>
          </div>
          <p className="text-gray-400">
            Create a Notes contract to enable students to upload and share their
            notes as NFTs.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-indigo-300">
            Notes Management
          </h3>
          <p className="text-sm text-green-400">Notes enabled</p>
        </div>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-indigo-300">Student Notes</CardTitle>
              <Badge
                variant="outline"
                className="bg-gray-800 text-gray-300 border-gray-700"
              >
                Contract: {notesContractAddress.slice(0, 6)}...
                {notesContractAddress.slice(-4)}
              </Badge>
            </div>
            <CardDescription className="text-gray-400">
              Students can share and purchase notes directly from each other
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              Notes sharing is enabled for this class.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar - Class Navigation */}
      <div className="w-72 h-screen bg-gray-900 border-r border-gray-800 overflow-y-auto hidden md:block">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Teacher Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">Welcome back, teacher</p>
        </div>

        <div className="p-4">
          <Button
            onClick={openCreateClassForm}
            disabled={isCreatingClass}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {isCreatingClass ? "Creating..." : "Create New Class"}
          </Button>
        </div>

        <div className="mt-2">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
            Your Classes
          </div>
          {isLoadingInitialData ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="h-5 w-5 text-indigo-400 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No classes available
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {classes.map((classItem) => (
                <Button
                  key={classItem.classAddress}
                  variant="ghost"
                  onClick={() => setSelectedClass(classItem.classAddress)}
                  className={`w-full justify-start text-sm px-3 py-2 ${
                    selectedClass === classItem.classAddress
                      ? "bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/50"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                  }`}
                >
                  <GraduationCap
                    className={`h-4 w-4 mr-2 ${
                      selectedClass === classItem.classAddress
                        ? "text-indigo-400"
                        : "text-gray-500"
                    }`}
                  />
                  <div className="truncate">{classItem.name}</div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile class selector dropdown - only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Teacher Dashboard
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={openCreateClassForm}
              disabled={isCreatingClass}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              size="sm"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          {isLoadingInitialData ? (
            <div className="flex items-center justify-center h-10">
              <LoaderCircle className="h-5 w-5 text-indigo-400 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-gray-500 p-2 bg-gray-800/70 rounded-md">
              No classes available
            </div>
          ) : (
            <select
              className="w-full bg-gray-800/70 border border-gray-700 rounded-md p-2 text-gray-300"
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="" disabled>
                Select a class
              </option>
              {classes.map((classItem) => (
                <option
                  key={classItem.classAddress}
                  value={classItem.classAddress}
                >
                  {classItem.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto md:pt-0 pt-24 pb-6">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Confirmation Messages */}
          {confirmationMessage && (
            <div className="bg-indigo-900/30 border-l-4 border-indigo-500 p-4 mb-6 rounded-md backdrop-blur-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-indigo-200">
                    {confirmationMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoadingInitialData ? (
            <div className="flex flex-col items-center justify-center h-64">
              <LoaderCircle className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading your dashboard...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-dashed border-gray-700 rounded-lg p-12 text-center">
              <GraduationCap className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">
                Welcome to your teaching dashboard
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first class to get started. You'll be able to manage
                lectures, take attendance, create quizzes, and enable student
                notes.
              </p>
              <Button
                onClick={openCreateClassForm}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </div>
          ) : !selectedClass ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Select a class from the sidebar
              </h3>
              <p className="text-gray-500">
                Choose one of your classes to view and manage
              </p>
            </div>
          ) : (
            // Selected class content
            <>
              {classes
                .filter((classItem) => classItem.classAddress === selectedClass)
                .map((classItem) => (
                  <div key={classItem.classAddress} className="space-y-6">
                    {/* Class Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                      <div className="mb-4 sm:mb-0">
                        <h1 className="text-2xl font-bold text-white">
                          {classItem.name}
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 font-mono">
                          {classItem.classAddress.slice(0, 6)}...
                          {classItem.classAddress.slice(-4)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMintForm(classItem.classAddress)}
                        className="border-indigo-600/30 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" /> Add Student
                      </Button>
                    </div>

                    {/* Class Tabs */}
                    <Tabs defaultValue="lectures" className="w-full">
                      <TabsList className="w-full grid grid-cols-3 bg-gray-800/80 border border-gray-700 rounded-lg mb-6">
                        <TabsTrigger
                          value="lectures"
                          className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Lectures
                        </TabsTrigger>
                        <TabsTrigger
                          value="quizzes"
                          className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
                        >
                          <FilePieChart className="h-4 w-4 mr-2" />
                          Quizzes
                        </TabsTrigger>
                        <TabsTrigger
                          value="notes"
                          className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Notes
                        </TabsTrigger>
                      </TabsList>

                      {/* Lectures Tab */}
                      <TabsContent value="lectures" className="space-y-6">
                        <Card className="border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-lg">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">
                              Create New Lecture
                            </CardTitle>
                            <CardDescription>
                              Add a new lecture to this class
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                              <div className="flex-1">
                                <Label
                                  htmlFor={`lectureTopic-${classItem.classAddress}`}
                                  className="text-sm font-medium text-gray-400 mb-1 block"
                                >
                                  Lecture Topic
                                </Label>
                                <Input
                                  id={`lectureTopic-${classItem.classAddress}`}
                                  value={
                                    lectureTopicsByClass[
                                      classItem.classAddress
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    setLectureTopicsByClass((prev) => ({
                                      ...prev,
                                      [classItem.classAddress]: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter lecture topic"
                                  className="w-full bg-gray-800/70 border-gray-700 text-gray-300 focus:border-indigo-500"
                                />
                              </div>
                              <Button
                                onClick={() =>
                                  handleCreateLecture(classItem.classAddress)
                                }
                                disabled={
                                  isCreatingLecture[classItem.classAddress] ||
                                  !lectureTopicsByClass[classItem.classAddress]
                                }
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                              >
                                {isCreatingLecture[classItem.classAddress]
                                  ? "Creating..."
                                  : "Create Lecture"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-white">
                            Lectures
                          </h3>
                          <Button
                            onClick={() =>
                              fetchLectures(classItem.classAddress)
                            }
                            disabled={
                              isFetchingLectures[classItem.classAddress]
                            }
                            variant="outline"
                            size="sm"
                            className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
                          >
                            {isFetchingLectures[classItem.classAddress] ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              "Refresh Lectures"
                            )}
                          </Button>
                        </div>

                        {lecturesByClass[classItem.classAddress]?.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {lecturesByClass[classItem.classAddress].map(
                              (lecture) => (
                                <Card
                                  key={lecture.id}
                                  className="border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-md hover:shadow-indigo-500/5 transition-shadow"
                                >
                                  <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <CardTitle className="text-lg text-white">
                                          {lecture.topic}
                                        </CardTitle>
                                        <CardDescription>
                                          <Badge
                                            variant="outline"
                                            className="mt-2 bg-gray-800 text-gray-300 border-gray-700"
                                          >
                                            Lecture ID: {lecture.id}
                                          </Badge>
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-3">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleTakeAttendance(
                                            lecture.id,
                                            classItem.classAddress
                                          )
                                        }
                                        className="flex-1 text-sm border-indigo-700/30 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-800/30"
                                      >
                                        Take Attendance
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewAttendance(
                                            lecture.id,
                                            classItem.classAddress
                                          )
                                        }
                                        className="flex-1 text-sm border-indigo-700/30 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-800/30"
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1.5" />{" "}
                                        View Attendance
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
                            <BookOpen className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                            <p className="text-gray-300 font-medium">
                              No lectures available
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Create your first lecture using the form above
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      {/* Quizzes Tab */}
                      <TabsContent value="quizzes" className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                          <h3 className="text-lg font-medium text-white mb-2 sm:mb-0">
                            Quiz Management
                          </h3>
                          {!quizContractsByClass[classItem.classAddress] ||
                          quizContractsByClass[classItem.classAddress]
                            ?.length === 0 ? (
                            <Button
                              onClick={() =>
                                openLinkQuizContractForm(classItem.classAddress)
                              }
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                            >
                              <Link className="h-4 w-4 mr-2" /> Enable Quiz
                              Module
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  refreshQuizContracts(classItem.classAddress)
                                }
                                variant="outline"
                                size="sm"
                                className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
                              >
                                Refresh Contracts
                              </Button>
                            </div>
                          )}
                        </div>

                        {quizContractsByClass[classItem.classAddress]?.length >
                        0 ? (
                          <div className="space-y-6">
                            {quizContractsByClass[classItem.classAddress].map(
                              (quizContractAddress) => (
                                <Card
                                  key={quizContractAddress}
                                  className="border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-md"
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <CardTitle className="text-lg text-white">
                                          Quiz Contract
                                        </CardTitle>
                                        <CardDescription className="mt-1 font-mono text-xs text-gray-500 break-all">
                                          {quizContractAddress}
                                        </CardDescription>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openCreateQuizForm(
                                            quizContractAddress,
                                            classItem.classAddress
                                          )
                                        }
                                        className="border-indigo-700/30 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-800/30"
                                      >
                                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />{" "}
                                        Create Quiz
                                      </Button>
                                    </div>
                                  </CardHeader>

                                  <CardContent className="p-0">
                                    {isFetchingQuizzes[quizContractAddress] ? (
                                      <div className="py-8 text-center">
                                        <LoaderCircle className="h-6 w-6 mx-auto text-indigo-500 animate-spin mb-2" />
                                        <p className="text-sm text-gray-400">
                                          Loading quizzes...
                                        </p>
                                      </div>
                                    ) : quizzesByContract[quizContractAddress]
                                        ?.length > 0 ? (
                                      <div className="divide-y divide-gray-800">
                                        {quizzesByContract[
                                          quizContractAddress
                                        ].map((quiz) => (
                                          <div key={quiz.id} className="p-4">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <div className="flex items-center">
                                                  <h4 className="font-medium text-white">
                                                    {quiz.title}
                                                  </h4>
                                                  <Badge
                                                    className={`ml-2 ${
                                                      quiz.isActive
                                                        ? "bg-green-900/50 text-green-300"
                                                        : "bg-gray-700/50 text-gray-300"
                                                    }`}
                                                  >
                                                    {quiz.isActive
                                                      ? "Active"
                                                      : "Inactive"}
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">
                                                  {quiz.description}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                                              <div className="flex items-center">
                                                <span className="font-medium mr-1">
                                                  Questions:
                                                </span>{" "}
                                                {quiz.questionCount}
                                              </div>
                                              <div className="flex items-center">
                                                <span className="font-medium mr-1">
                                                  Expires:
                                                </span>{" "}
                                                {new Date(
                                                  quiz.expiresAt * 1000
                                                ).toLocaleString()}
                                              </div>
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleViewQuizResults(
                                                    quiz.id,
                                                    quizContractAddress,
                                                    classItem.classAddress,
                                                    quiz.title
                                                  )
                                                }
                                                className="flex-1 text-xs border-indigo-700/30 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-800/30"
                                              >
                                                View Results
                                              </Button>
                                              {quiz.isActive && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleDeactivateQuiz(
                                                      quiz.id,
                                                      quizContractAddress
                                                    )
                                                  }
                                                  className="flex-1 text-xs border-red-700/30 bg-red-900/20 text-red-300 hover:bg-red-800/30"
                                                >
                                                  Deactivate
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 px-4">
                                        <FilePieChart className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                                        <p className="text-gray-300 font-medium">
                                          No quizzes available
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                          Create your first quiz by clicking the
                                          button above
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
                            <FilePieChart className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                            <p className="text-gray-300 font-medium">
                              Quiz module not enabled
                            </p>
                            <p className="text-sm text-gray-400 mt-1 mb-4 max-w-md mx-auto">
                              Enable the quiz module to create and manage
                              quizzes for your students
                            </p>
                            <Button
                              onClick={() =>
                                openLinkQuizContractForm(classItem.classAddress)
                              }
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                            >
                              <Link className="h-4 w-4 mr-2" /> Enable Quiz
                              Module
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      {/* Notes Tab */}
                      <TabsContent value="notes" className="space-y-6">
                        <Card className="border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-md">
                          <CardHeader>
                            <CardTitle className="text-lg text-white">
                              Notes Management
                            </CardTitle>
                            <CardDescription>
                              Enable students to share and purchase notes from
                              each other
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {renderNotesSection(
                              classItem.classAddress,
                              classItem.name
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {isPopupOpen && popupContent && (
        <Popup
          title={popupContent.title}
          content={popupContent.content}
          onClose={closePopup}
        />
      )}
    </div>
  );
}

export default TeacherDashboard;
