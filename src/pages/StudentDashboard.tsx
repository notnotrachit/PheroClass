/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  getEligibleClasses,
  getLectures,
  getOwnAttendance,
  markAttendance,
  getQuizzes,
  getQuizzesByLecture,
  getQuizQuestions,
  submitQuizAnswers,
  getQuizResults,
  getClassQuizzes,
  getNotesContractForClass,
} from "@/lib/contractService";
import { useWalletContext } from "@/context/WalletContext";
import Popup from "../components/Popup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  FilePieChart,
  FileText,
  QrCode,
  CheckCircle,
} from "lucide-react";
import TakeQuizForm from "../components/TakeQuizForm";
import QuizResults from "../components/QuizResults";
import UploadNotesForm from "../components/UploadNotesForm";
import NotesMarketplace from "../components/NotesMarketplace";
import MyNotes from "../components/MyNotes";
import QRScanner from "../components/QRScanner";
import { LoaderCircle } from "lucide-react";
import useSwipeTransition from "@/hooks/useSwipeTransition";

interface Class {
  classAddress: string;
  name: string;
  symbol: string;
}

interface Lecture {
  id: number;
  topic: string;
}

interface LecturesByClass {
  [classAddress: string]: Lecture[];
}

interface AttendanceByClass {
  [classAddress: string]: boolean[];
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

interface QuizContractsByClass {
  [classAddress: string]: string[];
}

interface QuizzesByContract {
  [quizContractAddress: string]: Quiz[];
}

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface QuizResult {
  hasAttempted: boolean;
  score: number;
  attemptedAt: number;
  totalQuestions: number;
}

interface QuizResultsByContract {
  [key: string]: QuizResult; // key will be `${quizContractAddress}-${quizId}`
}

interface PopupContentType {
  title: string;
  content: React.ReactNode;
}

interface NotesContractsByClass {
  [classAddress: string]: string;
}

export function StudentDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [lecturesByClass, setLecturesByClass] = useState<LecturesByClass>({});
  const [attendanceByClass, setAttendanceByClass] = useState<AttendanceByClass>(
    {}
  );
  const [isFetchingLectures, setIsFetchingLectures] = useState<{
    [key: string]: boolean;
  }>({});
  const [isMarkingAttendance, setIsMarkingAttendance] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<PopupContentType | null>(
    null
  );
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Quiz related state
  const [quizContractsByClass, setQuizContractsByClass] =
    useState<QuizContractsByClass>({});
  const [quizzesByContract, setQuizzesByContract] = useState<QuizzesByContract>(
    {}
  );
  const [isFetchingQuizzes, setIsFetchingQuizzes] = useState<{
    [key: string]: boolean;
  }>({});
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>(
    []
  );
  const [isFetchingQuizQuestions, setIsFetchingQuizQuestions] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResultsByContract, setQuizResultsByContract] =
    useState<QuizResultsByContract>({});

  // Notes related state
  const [notesContractsByClass, setNotesContractsByClass] =
    useState<NotesContractsByClass>({});
  const [activeTab, setActiveTab] = useState("attendance");
  const [contentRef, setContentRef] = useState<HTMLElement | null>(null);

  const { provider, address } = useWalletContext();

  // Tab order for swipe navigation
  const tabOrder = ["attendance", "quizzes", "notes"];

  // Use our new swipe transition hook
  const { containerRef, registerContentRef, transition } = useSwipeTransition({
    activeTab,
    tabOrder,
    onChangeTab: setActiveTab,
    threshold: 50,
  });

  // Apply transition style when changing tabs
  const getTabContentStyle = (tab: string) => {
    return {
      transition: transition
        ? "transform 0.3s ease-out, opacity 0.3s ease-out"
        : "none",
    };
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingInitialData(true);
        const eligibleClasses = await getEligibleClasses(address, provider);
        const formattedClasses = eligibleClasses.map((classData) => ({
          classAddress: classData[0],
          name: classData[1],
          symbol: classData[2],
        }));

        setClasses(formattedClasses);

        if (formattedClasses.length > 0) {
          // Set the first class as selected by default
          setSelectedClass(formattedClasses[0]);

          // Load data for each class
          for (const classItem of formattedClasses) {
            await fetchLectures(classItem.classAddress);
            await fetchAttendance(classItem.classAddress);

            // Get quiz contracts for this class
            try {
              const quizContracts = await getClassQuizzes(
                classItem.classAddress,
                provider
              );
              setQuizContractsByClass((prev) => ({
                ...prev,
                [classItem.classAddress]: quizContracts,
              }));

              // Fetch quizzes for each contract
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

    if (address && provider) {
      fetchInitialData();
    }
  }, [address, provider]);

  const fetchLectures = async (classAddress: string) => {
    try {
      setIsFetchingLectures((prev) => ({ ...prev, [classAddress]: true }));
      const lecturesList = await getLectures(classAddress, provider);
      setLecturesByClass((prev) => ({
        ...prev,
        [classAddress]: lecturesList,
      }));
    } catch (error) {
      console.error("Error fetching lectures:", error);
      setConfirmationMessage("Failed to fetch lectures. Please try again.");
    } finally {
      setIsFetchingLectures((prev) => ({ ...prev, [classAddress]: false }));
    }
  };

  const fetchAttendance = async (classAddress: string) => {
    try {
      const attendanceList = await getOwnAttendance(classAddress, provider);
      setAttendanceByClass((prev) => ({
        ...prev,
        [classAddress]: attendanceList,
      }));
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setConfirmationMessage("Failed to fetch attendance. Please try again.");
    }
  };

  const handleMarkAttendance = async (
    lectureId: number,
    classAddress: string
  ) => {
    const key = `${classAddress}-${lectureId}`;
    try {
      // Set the marking status
      setIsMarkingAttendance((prev) => ({ ...prev, [key]: true }));

      // Mark attendance on the blockchain
      await markAttendance(classAddress, lectureId, provider);

      // Set success message
      setConfirmationMessage("Attendance marked successfully!");

      // Then fetch updated attendance data
      try {
        const attendanceList = await getOwnAttendance(classAddress, provider);
        setAttendanceByClass((prev) => ({
          ...prev,
          [classAddress]: attendanceList,
        }));
      } catch (fetchError) {
        // Log fetch error but don't show it to the user since attendance was marked successfully
        console.error("Error refreshing attendance data:", fetchError);
      }
    } catch (error) {
      // Handle error in the attendance marking process
      console.error("Error marking attendance:", error);

      // Extract specific error message if available
      if (error instanceof Error) {
        const message = error.message;
        if (message.includes("Failed to mark attendance:")) {
          // Extract the specific error from the contract service
          const specificError = message
            .split("Failed to mark attendance:")[1]
            .trim();
          setConfirmationMessage(`Error: ${specificError}`);
        } else {
          setConfirmationMessage(`Error: ${message}`);
        }
      } else {
        setConfirmationMessage("Failed to mark attendance. Please try again.");
      }
    } finally {
      // Reset marking status
      setIsMarkingAttendance((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Quiz functionality
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

  const handleTakeQuiz = async (quiz: Quiz, quizContractAddress: string) => {
    try {
      setIsFetchingQuizQuestions(true);

      // First, check if the student has already taken this quiz
      const result = await getQuizResults(
        quizContractAddress,
        quiz.id,
        address,
        provider
      );

      if (result.hasAttempted) {
        // Show results instead of taking the quiz again
        showQuizResults(quiz, result);
        return;
      }

      // Fetch questions for the quiz
      const questions = await getQuizQuestions(
        quizContractAddress,
        quiz.id,
        provider
      );

      setCurrentQuizQuestions(questions);

      // Open the quiz taking popup
      setPopupContent({
        title: `Quiz: ${quiz.title}`,
        content: (
          <TakeQuizForm
            quiz={quiz}
            questions={questions}
            onSubmit={(answers) =>
              handleSubmitQuiz(quiz.id, answers, quizContractAddress)
            }
            isSubmitting={isSubmittingQuiz}
          />
        ),
      });
      setIsPopupOpen(true);
    } catch (error) {
      console.error("Error preparing quiz:", error);
      setConfirmationMessage(
        "Failed to load quiz questions. Please try again."
      );
    } finally {
      setIsFetchingQuizQuestions(false);
    }
  };

  const handleSubmitQuiz = async (
    quizId: number,
    answers: number[],
    quizContractAddress: string
  ) => {
    try {
      setIsSubmittingQuiz(true);

      // Submit the quiz answers
      await submitQuizAnswers(quizContractAddress, quizId, answers, provider);

      // Get the results
      const result = await getQuizResults(
        quizContractAddress,
        quizId,
        address,
        provider
      );

      // Store the result
      setQuizResultsByContract((prev) => ({
        ...prev,
        [`${quizContractAddress}-${quizId}`]: result,
      }));

      // Find the quiz details
      const quiz = Object.values(quizzesByContract)
        .flatMap((quizzes) => quizzes)
        .find((q) => q.id === quizId);

      if (quiz) {
        // Show the results
        showQuizResults(quiz, result);
      } else {
        setIsPopupOpen(false);
        setConfirmationMessage("Quiz submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setConfirmationMessage("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const showQuizResults = (quiz: Quiz, result: QuizResult) => {
    setPopupContent({
      title: `Quiz Results: ${quiz.title}`,
      content: (
        <QuizResults
          quizTitle={quiz.title}
          score={result.score}
          totalQuestions={result.totalQuestions}
          attemptedAt={new Date(result.attemptedAt)}
        />
      ),
    });
    setIsPopupOpen(true);
  };

  const fetchQuizResult = async (
    quizId: number,
    quizContractAddress: string
  ) => {
    try {
      const result = await getQuizResults(
        quizContractAddress,
        quizId,
        address,
        provider
      );

      setQuizResultsByContract((prev) => ({
        ...prev,
        [`${quizContractAddress}-${quizId}`]: result,
      }));

      return result;
    } catch (error) {
      console.error("Error fetching quiz result:", error);
      return null;
    }
  };

  const handleViewQuizResult = async (
    quiz: Quiz,
    quizContractAddress: string
  ) => {
    try {
      // Check if we already have the result
      let result = quizResultsByContract[`${quizContractAddress}-${quiz.id}`];

      // If not, fetch it
      if (!result) {
        result = await fetchQuizResult(quiz.id, quizContractAddress);
      }

      if (result && result.hasAttempted) {
        showQuizResults(quiz, result);
      } else {
        setConfirmationMessage("You haven't attempted this quiz yet.");
      }
    } catch (error) {
      console.error("Error viewing quiz result:", error);
      setConfirmationMessage("Failed to load quiz results. Please try again.");
    }
  };

  const refreshQuizzes = async (classAddress: string) => {
    try {
      // Get quiz contracts for this class
      const quizContracts = await getClassQuizzes(classAddress, provider);
      setQuizContractsByClass((prev) => ({
        ...prev,
        [classAddress]: quizContracts,
      }));

      // Fetch quizzes for each contract
      for (const quizContractAddress of quizContracts) {
        await fetchQuizzes(quizContractAddress);
      }

      setConfirmationMessage("Quizzes refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing quizzes:", error);
      setConfirmationMessage("Failed to refresh quizzes. Please try again.");
    }
  };

  const handleUploadNotes = () => {
    if (!selectedClass || !notesContractsByClass[selectedClass.classAddress]) {
      setConfirmationMessage("Notes feature is not available for this class.");
      return;
    }

    const lectures = lecturesByClass[selectedClass.classAddress] || [];

    setPopupContent({
      title: "Upload Notes",
      content: (
        <UploadNotesForm
          lectures={lectures}
          notesContractAddress={
            notesContractsByClass[selectedClass.classAddress]
          }
          onSuccess={() => {
            setIsPopupOpen(false);
            setConfirmationMessage("Notes uploaded successfully!");
          }}
        />
      ),
    });

    setIsPopupOpen(true);
  };

  const renderNotesTabs = () => {
    if (!selectedClass) {
      return <p>Please select a class</p>;
    }

    const notesContractAddress =
      notesContractsByClass[selectedClass.classAddress];

    if (!notesContractAddress) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Notes Not Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            The notes feature is not available for this class.
          </p>
        </div>
      );
    }

    return (
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800/70 border border-gray-700">
          <TabsTrigger
            value="marketplace"
            className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
          >
            Marketplace
          </TabsTrigger>
          <TabsTrigger
            value="my-notes"
            className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
          >
            My Notes
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
          >
            Upload Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-300">
              Notes Marketplace
            </h2>
          </div>
          <NotesMarketplace notesContractAddress={notesContractAddress} />
        </TabsContent>

        <TabsContent value="my-notes" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-300">My Notes</h2>
          </div>
          <MyNotes notesContractAddress={notesContractAddress} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-300">Upload Notes</h2>
          </div>
          <Card className="bg-gray-900/70 backdrop-blur-sm border border-gray-700">
            <CardHeader>
              <CardTitle className="text-indigo-300">
                Share Your Notes
              </CardTitle>
              <CardDescription className="text-gray-400">
                Upload your notes as a PDF to share with classmates. Your notes
                will be reviewed by the instructor before becoming available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadNotesForm
                lectures={lecturesByClass[selectedClass.classAddress] || []}
                notesContractAddress={
                  notesContractsByClass[selectedClass.classAddress]
                }
                onSuccess={() => {
                  setConfirmationMessage("Notes uploaded successfully!");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setPopupContent(null);
  };

  // Render all quizzes from all contracts
  const renderQuizzes = (classAddress: string) => {
    // Get all quiz contracts for this class
    const quizContracts = quizContractsByClass[classAddress] || [];

    // If no quiz contracts, show a message
    if (quizContracts.length === 0) {
      return (
        <div className="text-center p-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700 text-gray-400">
          No quizzes available for this class.
        </div>
      );
    }

    // Render
    return (
      <div className="space-y-3">
        {quizContracts.map((contractAddress) => {
          const quizzes = quizzesByContract[contractAddress] || [];
          const activeQuizzes = quizzes.filter((quiz) => quiz.isActive);

          if (activeQuizzes.length === 0) return null;

          return activeQuizzes.map((quiz) => {
            const isExpired = Date.now() > quiz.expiresAt;
            const result =
              quizResultsByContract[`${contractAddress}-${quiz.id}`];
            const hasAttempted = result?.hasAttempted;

            const lectureInfo = lecturesByClass[classAddress]?.find(
              (l) => l.id === quiz.lectureId
            );

            return (
              <div
                key={`${contractAddress}-${quiz.id}`}
                className={`p-4 border rounded-lg bg-gray-800/70 backdrop-blur-sm border-gray-700 shadow-md hover:shadow-indigo-500/5 transition-all ${
                  isExpired && !hasAttempted ? "opacity-70" : ""
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-white">{quiz.title}</h3>
                    {hasAttempted ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-600/30">
                        Completed
                      </span>
                    ) : isExpired ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-600/30">
                        Expired
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-600/30">
                        Available
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-300">{quiz.description}</p>

                  <div className="text-xs text-gray-400">
                    <div>Questions: {quiz.questionCount}</div>
                    <div>Lecture: {lectureInfo?.topic || quiz.lectureId}</div>
                    <div>
                      Expires: {new Date(quiz.expiresAt).toLocaleString()}
                    </div>
                    {hasAttempted && (
                      <div className="text-indigo-400 font-medium mt-1">
                        Score: {result.score}/{result.totalQuestions} (
                        {Math.round(
                          (result.score / result.totalQuestions) * 100
                        )}
                        %)
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {hasAttempted ? (
                      <Button
                        onClick={() =>
                          handleViewQuizResult(quiz, contractAddress)
                        }
                        variant="outline"
                        size="sm"
                        className="border-indigo-700 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-800/50"
                      >
                        View Results
                      </Button>
                    ) : !isExpired ? (
                      <Button
                        onClick={() => handleTakeQuiz(quiz, contractAddress)}
                        disabled={isFetchingQuizQuestions}
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        {isFetchingQuizQuestions
                          ? "Loading Quiz..."
                          : "Take Quiz"}
                      </Button>
                    ) : (
                      <span className="text-red-400 text-sm block mt-1">
                        This quiz has expired and can no longer be taken
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  const openQRScanner = () => {
    setPopupContent({
      title: "Scan Attendance QR Code",
      content: (
        <QRScanner
          onScan={handleQRScan}
          onError={(error) => {
            console.error("QR Scanner error:", error);
            setConfirmationMessage(
              "Error accessing camera. Please check camera permissions and try again."
            );
            setIsPopupOpen(false);
          }}
          onCancel={() => setIsPopupOpen(false)}
        />
      ),
    });
    setIsPopupOpen(true);
  };

  const handleQRScan = (data: { lectureId: number; classAddress: string }) => {
    // Verify the data contains what we need
    if (!data || !data.lectureId || !data.classAddress) {
      setConfirmationMessage(
        "Invalid QR code. Please scan a valid attendance QR code."
      );
      setIsPopupOpen(false);
      return;
    }

    // Check if the scanned QR is for the currently selected class
    if (selectedClass && data.classAddress !== selectedClass.classAddress) {
      setConfirmationMessage(
        "The scanned QR code is for a different class than the one you have selected."
      );
      setIsPopupOpen(false);
      return;
    }

    // All checks passed, mark attendance
    try {
      // Close the QR scanner popup first
      setIsPopupOpen(false);
      // Then mark attendance
      handleMarkAttendance(data.lectureId, data.classAddress);
    } catch (error) {
      console.error("Error in QR scan process:", error);
      setConfirmationMessage("Failed to process attendance. Please try again.");
    }
  };

  // Render
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar - Class Navigation */}
      <div className="w-72 h-screen bg-gray-900 border-r border-gray-800 overflow-y-auto hidden md:block">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Student Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">Welcome, student</p>
        </div>

        <div className="p-4">
          <Button
            onClick={openQRScanner}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Scan Attendance QR
          </Button>
        </div>

        <div className="mt-2">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
            My Classes
          </div>
          {isLoadingInitialData ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="h-5 w-5 text-indigo-400 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              Not enrolled in any classes
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {classes.map((classItem) => (
                <Button
                  key={classItem.classAddress}
                  variant="ghost"
                  onClick={() => setSelectedClass(classItem)}
                  className={`w-full justify-start text-sm px-3 py-2 ${
                    selectedClass?.classAddress === classItem.classAddress
                      ? "bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/50"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                  }`}
                >
                  <BookOpen
                    className={`h-4 w-4 mr-2 ${
                      selectedClass?.classAddress === classItem.classAddress
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

      {/* Mobile header and class selector - only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-lg">
        {/* Top header with logo and scan button */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800/50">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Student Dashboard
          </h2>
          <Button
            onClick={openQRScanner}
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            <QrCode className="h-4 w-4 mr-1" /> Scan
          </Button>
        </div>
        {/* Class selection cards */}
        <div className="px-3 py-2">
          {isLoadingInitialData ? (
            <div className="flex items-center justify-center h-10">
              <LoaderCircle className="h-5 w-5 text-indigo-400 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-gray-500 p-2 bg-gray-800/70 rounded-md">
              Not enrolled in any classes
            </div>
          ) : (
            <div className="relative">
              <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-3 snap-x">
                {classes.map((classItem) => (
                  <div
                    key={classItem.classAddress}
                    onClick={() => setSelectedClass(classItem)}
                    className={`flex-shrink-0 min-w-[160px] max-w-[160px] snap-start rounded-lg shadow-md transition-transform ${
                      selectedClass?.classAddress === classItem.classAddress
                        ? "border-2 border-indigo-500 transform scale-[1.02]"
                        : "border border-gray-700"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg h-full flex flex-col ${
                        selectedClass?.classAddress === classItem.classAddress
                          ? "bg-gradient-to-br from-indigo-900/70 to-purple-900/70"
                          : "bg-gray-800/70"
                      }`}
                    >
                      <div className="mb-1">
                        <BookOpen
                          className={`h-5 w-5 ${
                            selectedClass?.classAddress ===
                            classItem.classAddress
                              ? "text-indigo-300"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <h3
                        className={`font-medium text-sm line-clamp-2 ${
                          selectedClass?.classAddress === classItem.classAddress
                            ? "text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {classItem.name}
                      </h3>
                      <div
                        className={`mt-1 text-xs truncate ${
                          selectedClass?.classAddress === classItem.classAddress
                            ? "text-indigo-300/80"
                            : "text-gray-500"
                        }`}
                      >
                        {classItem.symbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none">
                <div className="flex gap-1">
                  {classes.map((classItem, index) => (
                    <div
                      key={classItem.classAddress}
                      className={`h-1 rounded-full transition-all duration-200 ${
                        selectedClass?.classAddress === classItem.classAddress
                          ? "w-4 bg-indigo-500"
                          : "w-1 bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Active tab indicators */}
        {selectedClass && (
          <div className="flex text-xs text-center border-t border-gray-800/50">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex-1 py-2 flex flex-col items-center ${
                activeTab === "attendance"
                  ? "text-indigo-300 border-b-2 border-indigo-500"
                  : "text-gray-400"
              }`}
            >
              <BookOpen className="h-4 w-4 mb-1" />
              Attendance
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`flex-1 py-2 flex flex-col items-center ${
                activeTab === "quizzes"
                  ? "text-indigo-300 border-b-2 border-indigo-500"
                  : "text-gray-400"
              }`}
            >
              <FilePieChart className="h-4 w-4 mb-1" />
              Quizzes
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 py-2 flex flex-col items-center ${
                activeTab === "notes"
                  ? "text-indigo-300 border-b-2 border-indigo-500"
                  : "text-gray-400"
              }`}
            >
              <FileText className="h-4 w-4 mb-1" />
              Notes
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-y-auto md:pt-0 pt-24 pb-6"
        ref={containerRef}
      >
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
              <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">
                You are not enrolled in any classes
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Once a teacher enrolls you in a class, it will appear here.
                You'll be able to mark attendance, take quizzes, and access
                notes.
              </p>
            </div>
          ) : !selectedClass ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Select a class from the sidebar
              </h3>
              <p className="text-gray-500">
                Choose one of your classes to view
              </p>
            </div>
          ) : (
            // Selected class content
            <div className="space-y-6">
              {/* Class Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <div className="mb-4 sm:mb-0">
                  <h1 className="text-2xl font-bold text-white">
                    {selectedClass.name}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1 font-mono">
                    {selectedClass.classAddress.slice(0, 6)}...
                    {selectedClass.classAddress.slice(-4)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openQRScanner}
                  className="border-indigo-600/30 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
                >
                  <QrCode className="h-4 w-4 mr-2" /> Scan QR
                </Button>
              </div>

              {/* Class Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-3 bg-gray-800/80 border border-gray-700 rounded-lg mb-6">
                  <TabsTrigger
                    value="attendance"
                    className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Attendance
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

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="space-y-6">
                  <div
                    ref={(el) => registerContentRef("attendance", el)}
                    style={getTabContentStyle("attendance")}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-white">
                        Attendance Records
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          fetchAttendance(selectedClass.classAddress)
                        }
                        className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
                      >
                        Refresh Attendance
                      </Button>
                    </div>

                    {isFetchingLectures[selectedClass.classAddress] ? (
                      <div className="flex items-center justify-center h-40">
                        <LoaderCircle className="h-6 w-6 text-indigo-400 animate-spin mr-2" />
                        <span className="text-gray-400">
                          Loading lectures...
                        </span>
                      </div>
                    ) : lecturesByClass[selectedClass.classAddress]?.length >
                      0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lecturesByClass[selectedClass.classAddress].map(
                          (lecture) => (
                            <Card
                              key={lecture.id}
                              className="border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-md hover:shadow-indigo-500/5 transition-shadow"
                            >
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-white">
                                  {lecture.topic}
                                </CardTitle>
                                <CardDescription>
                                  Lecture ID: {lecture.id}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex justify-end mt-2">
                                  {attendanceByClass[
                                    selectedClass.classAddress
                                  ]?.[lecture.id - 1] ? (
                                    <span className="px-3 py-1.5 bg-indigo-900/50 text-indigo-300 rounded-full text-xs font-medium border border-indigo-600/50">
                                      Attended
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1.5 bg-red-900/30 text-red-300 rounded-full text-xs font-medium border border-red-600/30">
                                      Not Attended
                                    </span>
                                  )}
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
                          Lectures will appear once your teacher creates them
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Quizzes Tab */}
                <TabsContent value="quizzes" className="space-y-6">
                  <div
                    ref={(el) => registerContentRef("quizzes", el)}
                    style={getTabContentStyle("quizzes")}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-white">
                        Available Quizzes
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          refreshQuizzes(selectedClass.classAddress)
                        }
                        className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
                      >
                        Refresh Quizzes
                      </Button>
                    </div>

                    {quizContractsByClass[selectedClass.classAddress]
                      ?.length === 0 ? (
                      <div className="text-center py-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
                        <FilePieChart className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                        <p className="text-gray-300 font-medium">
                          No quizzes available
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Quizzes will appear once your teacher creates them
                        </p>
                      </div>
                    ) : (
                      renderQuizzes(selectedClass.classAddress)
                    )}
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-6">
                  <div
                    ref={(el) => registerContentRef("notes", el)}
                    style={getTabContentStyle("notes")}
                  >
                    {renderNotesTabs()}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
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

export default StudentDashboard;
