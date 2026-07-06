import { redirect } from "next/navigation";

// Purchased PDF exams now live inside /my-courses ("พื้นที่การเรียนของฉัน") so
// everything a student bought is in one place. Keep this route as a redirect so
// old links, bookmarks, and the checkout success page still land correctly.
export default function MyExamPapersRedirect() {
    redirect("/my-courses");
}
