
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const Login = () => {
  const [totpValue, setTotpValue] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check if user is already logged in
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
      navigate('/generate-lyric-book');
    }
  }, [navigate]);

  // Function to decode BASE64 string
  const decodeBase64 = (base64String: string): string => {
    try {
      return atob(base64String);
    } catch (error) {
      console.error('Error decoding BASE64:', error);
      return '';
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get the secret hash from Firestore
      const secretDocRef = doc(db, 'secret', 'secret-hash');
      const secretDoc = await getDoc(secretDocRef);
      
      if (!secretDoc.exists()) {
        toast({
          title: "Authentication error",
          description: "Could not retrieve authentication information.",
          variant: "destructive",
        });
        return;
      }
      
      // Get the BASE64 key from the document
      const base64Key = secretDoc.data().key;
      
      // Decode the BASE64 key
      const decodedKey = decodeBase64(base64Key);
      
      // Validate the entered pass code against the decoded key
      if (totpValue === decodedKey) {
        // Store authentication status
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        
        toast({
          title: "Login successful",
          description: "Welcome to the Lyrics Generator!",
        });
        
        // Redirect to the main application
        navigate('/generate-lyric-book');
      } else {
        toast({
          title: "Login failed",
          description: "Invalid authentication code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating pass code:', error);
      toast({
        title: "Authentication error",
        description: "An error occurred while validating your pass code.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-32 h-32 aspect-square mb-4">
            <img 
              src="/uploads/1c578e45-7eb7-48b7-91bf-237ccf296b4a.png" 
              alt="Strums 'n Hums Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome to Lyrics Generator</CardTitle>
          <CardDescription className="text-center">
            Enter your pass code to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={totpValue} onChange={(value) => setTotpValue(value)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                 Vibe panrom. Saththama panrom!
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
